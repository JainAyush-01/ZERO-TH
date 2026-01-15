const redisClient = require('../config/redis');
const Users = require('../models/user');
const validate = require('../utils/validate');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/mailer');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const mongoose = require('mongoose');
 
// 1. REGISTER
const register = async (req ,res)=>{
    try {   
        const {firstName , emailId , password, otp} = req.body;

        // Verify OTP first
        const storedOtp = await redisClient.get(`otp:${emailId}`);
        if (!storedOtp || storedOtp !== otp) {
            return res.status(400).json({ message: "Invalid or Expired OTP" });
        }

        validate(req.body);

        const isEmailUnique = await Users.exists({emailId});
        if(isEmailUnique) throw new Error("EmailId already exists");

        const hashedPassword = await bcrypt.hash(password , 10);
        
        const user = await Users.create({
            firstName, 
            emailId, 
            password: hashedPassword, 
            role: "user",
            isVerified: true
        }); 

        // Clear OTP
        await redisClient.del(`otp:${emailId}`);

        const token = jwt.sign({_id : user._id , role : user.role}, process.env.JWT_KEY, {expiresIn : "7d"});
        
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: isProduction, 
            sameSite: 'lax',
            path: '/'
        });

        res.status(201).send("User Registered Successfully");
    } catch(err) {
        res.status(400).send("Error : " + err.message); 
    }
}

// 2. LOGIN
const login = async (req , res)=>{
    try {
        const {emailId , password} = req.body;

        if(!emailId || !password) throw new Error("Invalid Credentials");

        const user = await Users.findOne({emailId});
        if(!user) throw new Error("Invalid Credentials");

        const match = await bcrypt.compare(password , user.password);
        if(!match) throw new Error("Invalid Credentials");

        const token = jwt.sign({_id : user._id , role : user.role}, process.env.JWT_KEY, {expiresIn : "7d"});
        
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/'
        });

        res.status(200).send("Logged In Successfully");
    } catch(err) {
        res.status(401).send("Error: " + err.message);
    }
}

// 3. LOGOUT
const logout = async (req ,res)=>{
    try {
        const {token} = req.cookies;
        if(token) {
            try {
                const payload = jwt.decode(token);
                if(payload && payload.exp) {
                    const ttl = payload.exp - Math.floor(Date.now() / 1000);
                    if(ttl > 0) await redisClient.set(`token:${token}`, 'Blocked', { EX: ttl });
                }
            } catch(e) { console.log("Redis skip"); }
        }

        const isProduction = process.env.NODE_ENV === 'production';
        res.clearCookie("token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/'
        });
        res.send("Logged Out Successfully");
    } catch(err) {
        res.clearCookie("token");
        res.status(200).send("Logged Out (Fallback)");
    }
}

// 4. GOOGLE AUTH
const googleAuth = async (req, res) => {
    try {
        const { idToken } = req.body;
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, given_name } = payload;

        let user = await Users.findOne({ emailId: email });

        if (!user) {
            const randomPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            
            user = await Users.create({
                firstName: given_name,
                emailId: email,
                password: hashedPassword,
                role: 'user',
                isVerified: true
            });
        }

        const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_KEY, {expiresIn: "7d"});
        
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure:isProduction,
            sameSite: 'lax',
            path: '/'
        });

        res.status(200).json({ message: "Google Login Successful" });
    } catch (err) {
        console.error("Google Auth Error:", err.message);
        res.status(401).json({ 
            message: "Invalid Google Token", 
            error: err.message // This helps us see if it's an "audience mismatch"
        });
    }
};

// 5. SEND OTP (For Registration)
const sendOtp = async (req, res) => {
    try {
        const { emailId, type } = req.body; // type can be 'register' or 'reset'
        if (!emailId) return res.status(400).send("Email required");

        const userExists = await Users.exists({ emailId });

        // Logic: If registering, user shouldn't exist. If resetting, user MUST exist.
        if (type === 'register' && userExists) {
            return res.status(400).send("Email already registered");
        }
        if (type === 'reset' && !userExists) {
            return res.status(404).send("User not found");
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await redisClient.set(`otp:${emailId}`, otp, { EX: 300 });

        try {
            await sendOTPEmail(emailId, otp);
            res.status(200).json({ message: "OTP sent to email" });
        } catch (emailError) {
            console.error("Email failed, fallback:", emailError);
            console.log(`🔐 FALLBACK OTP FOR ${emailId}: ${otp}`);
            res.status(200).json({ message: "Email service busy. Check console (Dev)." });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send("System Error");
    }
}

// 6. FORGOT PASSWORD (Initiate) -> Uses sendOtp logic usually, but handled separately for clarity
const forgotPassword = async (req, res) => {
    // Reuse sendOtp with type='reset' logic for simplicity on frontend
    // Or call this specific endpoint
    try {
        const { emailId } = req.body;
        const user = await Users.findOne({ emailId });
        if(!user) return res.status(404).send("User not found");

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await redisClient.set(`reset_otp:${emailId}`, otp, { EX: 300 }); // Different key prefix for safety

        try {
            await sendOTPEmail(emailId, otp);
            res.status(200).send("OTP Sent");
        } catch(e) {
            console.log(`🔐 RESET OTP: ${otp}`);
            res.status(200).send("OTP Sent (Dev)");
        }
    } catch(err) {
        res.status(500).send("Error");
    }
}

// 7. RESET PASSWORD (Finalize)
const resetPassword = async (req, res) => {
    try {
        const { emailId, otp, newPassword } = req.body;
        
        const storedOtp = await redisClient.get(`reset_otp:${emailId}`);
        if(!storedOtp || storedOtp !== otp) {
            return res.status(400).send("Invalid or Expired OTP");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await Users.findOneAndUpdate({ emailId }, { password: hashedPassword });
        
        await redisClient.del(`reset_otp:${emailId}`);
        res.status(200).send("Password Updated Successfully");
    } catch(err) {
        res.status(500).send("Error resetting password");
    }
}

// --- ADMIN & UTILS ---

const adminRegister = async (req, res) => {
    try {
        const { firstName, emailId, password, role } = req.body;
        const allowedRoles = ['admin', 'creator', 'tester'];
        if (!allowedRoles.includes(role)) return res.status(400).json({ message: "Invalid Role" });

        const userExists = await Users.exists({ emailId });
        if (userExists) return res.status(400).json({ message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        await Users.create({ firstName, emailId, password: hashedPassword, role }); 

        res.status(201).json({ message: `${role} initialized successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message }); 
    }
}

const deleteProfile = async(req , res)=>{
    try {
        const userId = req.result._id;
        await Users.findByIdAndDelete(userId);
        res.status(200).send("Deleted Successfully");
    } catch(err) {
        res.status(500).send("Error : " + err);
    }
}

const fetchDetails = async (req, res) => {
    try {
        const user = req.result; // From middleware
        if (!user) return res.status(404).send("User not found");

        // 1. Safe Count Logic
        // If Problem model crashes, return 0 instead of crashing the whole request
        let totalProblems = 0;
        try {
            totalProblems = await mongoose.model('problem').countDocuments();
        } catch (e) { console.error("Problem Count Error", e); }

        // 2. Safe Submission Logic
        // We use 'submission' (lowercase) because that's what you named the model
        let attemptedIds = [];
        try {
            // Check if model exists before querying to prevent crash
            if (mongoose.models['submission']) {
                const Submission = mongoose.model('submission');
                attemptedIds = await Submission.distinct('problemId', { userId: user._id });
            }
        } catch (e) { console.error("Submission Count Error", e); }

        res.status(200).json({
            _id: user._id,
            firstName: user.firstName,
            emailId: user.emailId,
            role: user.role,
            problemSolved: user.problemSolved || [],
            stats: {
                solved: user.problemSolved ? user.problemSolved.length : 0,
                total: totalProblems,
                attempted: attemptedIds.length
            }
        });
    } catch (err) {
        console.error("Fetch Details Critical Error:", err);
        // Don't send 500. Send 401 so frontend redirects to login instead of showing error screen.
        res.status(401).send("Session Invalid");
    }
}

const fetchLeaderboard = async (req, res) => {
    try {
        const leaderboard = await Users.aggregate([
            {
                $project: {
                    firstName: 1,
                    solvedCount: { $size: { "$ifNull": ["$problemSolved", []] } }
                }
            },
            { $sort: { solvedCount: -1 } }, 
            { $limit: 10 }
        ]);
        res.status(200).json(leaderboard);
    } catch (err) {
        res.status(500).send("Error fetching leaderboard");
    }
}

module.exports = { 
    register, login, logout, 
    adminRegister, deleteProfile, fetchDetails, fetchLeaderboard, 
    googleAuth, sendOtp, 
    forgotPassword, resetPassword // <--- Added New Exports
};