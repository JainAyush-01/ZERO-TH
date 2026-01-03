const redisClient = require('../config/redis');
const Users = require('../models/user');
const validate = require('../utils/validate');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Submission = require('../models/submission');
const Problem = require('../models/problem');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { sendOTPEmail } = require('../utils/mailer');
 
const register = async (req, res) => {
    try {   
        const { firstName, emailId, password, otp } = req.body; // <--- Expect OTP

        // A. Verify OTP
        const storedOtp = await redisClient.get(`otp:${emailId}`);
        if (!storedOtp || storedOtp !== otp) {
            return res.status(400).json({ message: "Invalid or Expired OTP" });
        }

        // B. Proceed with Creation
        validate(req.body);
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await Users.create({
            firstName, emailId, password: hashedPassword, role: "user", isVerified: true
        });

        // Clear OTP
        await redisClient.del(`otp:${emailId}`);

        // Generate Token
        const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_KEY);
        const isProduction = true

        res.cookie('token', token, {
            maxAge: 60 * 60 * 1000,
            httpOnly: true,
            // PRODUCTION SETTINGS
            secure: isProduction, // TRUE in production (HTTPS), FALSE in dev (HTTP)
            sameSite: isProduction ? 'none' : 'lax' // 'none' allows cross-site (Vercel -> Render)
        });

        res.status(201).send("User Registered");
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}

const login = async (req , res)=>{

    try
    {
        const {emailId , password} = req.body;

        if(!emailId || !password)
            throw new Error("Invalid Credentials");

        const user = await Users.findOne({emailId});
        const match = bcrypt.compare(password , user.password);

        if(!match)
            throw new Error("Invalid Credentials");

        const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_KEY);
        
        // Use environment variable, but fallback to FALSE for localhost if undefined
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('token', token, {
            maxAge: 60 * 60 * 1000, // 1 Hour
            httpOnly: true,         // Security: JS can't read
            secure: isProduction,   // HTTPS only in prod
            sameSite: isProduction ? 'none' : 'lax', // Cross-site in prod
            // NEW: This helps with recent Chrome privacy sandbox changes
            partitioned: isProduction 
        });

        res.status(200).send("Logged In Successfully");
    }
    catch(err)
    {
        res.status(401).send("Error: " + err);
    }
}

const logout = async (req ,res)=>{

    try
    {
        //Validate The token -> Already Implemented using middleware
        //Add token to redis to block it 

        const {token} = req.cookies;
        const payload = jwt.decode(token);

        await redisClient.set(`token:${token}`,'Blocked');
        await redisClient.expireAt(`token:${token}` , payload.exp)
        //Clear the cookies

        res.cookie("token" , null,{expires : new Date(Date.now())});
        res.send("Logged Out Successfully")
    }
    catch(err)
    {
        res.status(503).send("Error : " + err); //503 because whenever error will be throw it will be redis only which means it is not able to connect
    }
}

const adminRegister = async (req, res) => {
    try {
        const { firstName, emailId, password, role } = req.body;

        // 1. Log the attempt (Debugging)
        console.log(`Admin attempting to create role: ${role} for ${emailId}`);

        // 2. Validate Allowed Roles
        const allowedRoles = ['admin', 'creator', 'tester'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid System Role" });
        }

        // 3. Check for Duplicates
        const userExists = await Users.exists({ emailId });
        if (userExists) {
            return res.status(400).json({ message: "Email already exists in the system" });
        }

        // 4. Create User
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await Users.create({
            firstName,
            emailId,
            password: hashedPassword,
            role: role // Explicitly set the role
        }); 

        res.status(201).json({ message: `${role} initialized successfully` });

    } catch (err) {
        console.error("Create Role Error:", err);
        // Send JSON so frontend toast can read it
        res.status(500).json({ message: err.message || "Internal Server Error" }); 
    }
}

const deleteProfile = async(req , res)=>{

    try
    {
        const userId = req.result._id;
        await Users.findByIdAndDelete(userId);

       // await Submission.deleteMany({userId}); Now no need of this as we already handles this userSchema in user.js using post
       
        res.status(200).send("Deleted Successfully");
    }
    catch(err)
    {
        res.status(500).send("Error : " + err);
    }
}



const fetchDetails = async (req, res) => {
    try {
        const user = req.result; // From middleware
        if (!user) return res.status(404).send("User not found");

        // 1. Get Total Problem Count (Global)
        const totalProblems = await Problem.countDocuments();

        // 2. Get Count of Unique Problems Attempted by this User
        // (distinct finds all unique problemIds in the submissions table for this user)
        const attemptedIds = await Submission.distinct('problemId', { userId: user._id });

        res.status(200).json({
            _id: user._id,
            firstName: user.firstName,
            emailId: user.emailId,
            role: user.role,
            problemSolved: user.problemSolved || [],
            stats: {
                solved: user.problemSolved.length,
                total: totalProblems,
                attempted: attemptedIds.length
            }
        });
    } catch (err) {
        console.error("Fetch Details Error:", err);
        res.status(500).send("Error fetching profile");
    }
}

const fetchLeaderboard = async (req, res) => {
    try {
        const leaderboard = await Users.aggregate([
            {
                $project: {
                    firstName: 1,
                    emailId: 1,
                    role: 1,
                    solvedCount: { $size: { "$ifNull": ["$problemSolved", []] } } // Count the array length
                }
            },
            { $sort: { solvedCount: -1 } }, // Sort Descending
            { $limit: 10 } // Top 10 only
        ]);

        res.status(200).json(leaderboard);
    } catch (err) {
        res.status(500).send("Error fetching leaderboard");
    }
}

// Don't forget to export it!
const googleAuth = async (req, res) => {
    try {
        const { idToken } = req.body; // Frontend sends this

        // 1. Verify Token with Google
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        // payload contains: { email, given_name, picture, sub }
        const { email, given_name } = payload;

        // 2. Check if user exists
        let user = await Users.findOne({ emailId: email });

        // 3. If new user, register them automatically
        if (!user) {
            // Create a dummy password for Google users (they won't use it)
            const randomPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            
            user = await Users.create({
                firstName: given_name,
                emailId: email,
                password: hashedPassword,
                role: 'user',
                isVerified: true // Google emails are already verified
            });
        }

        // 4. Generate JWT (Same as normal login)
        const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_KEY);
        
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            maxAge: 60 * 60 * 1000,
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax'
        });

        res.status(200).json({ message: "Google Login Successful" });

    } catch (err) {
        console.error("Google Auth Error:", err);
        res.status(401).send("Invalid Google Token");
    }
};

const sendOtp = async (req, res) => {
    try {
        const { emailId } = req.body;
        if (!emailId) return res.status(400).send("Email required");

        // Check if user already exists (Prevent duplicate reg)
        const exists = await Users.exists({ emailId });
        if (exists) return res.status(400).send("Email already registered");

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to Redis (Expire in 5 mins = 300s)
        await redisClient.set(`otp:${emailId}`, otp, { EX: 300 });

        // Send Email
        await sendOTPEmail(emailId, otp);

        res.status(200).send("OTP sent to email");
    } catch (err) {
        console.error("OTP SYSTEM ERROR:", err);
        res.status(500).send("Error sending OTP: " + err.message);
    }
}

module.exports = { 
    register, login, logout, adminRegister, 
    deleteProfile, fetchDetails, fetchLeaderboard, 
    googleAuth, sendOtp
};