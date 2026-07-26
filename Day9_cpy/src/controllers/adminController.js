const User = require('../models/user');
const Problem = require('../models/problem');
const Submission = require('../models/submission');
const mongoose = require('mongoose');

// 1. Get System Stats (Dashboard Overview)
const getSystemStats = async (req, res) => {
    try {
        // FIXED: Run all independent queries concurrently
        const [totalUsers, totalProblems, totalSubmissions, adminCount] = await Promise.all([
            User.countDocuments(),
            Problem.countDocuments(),
            Submission.countDocuments(),
            User.countDocuments({ role: 'admin' })
        ]);
        
        // FIXED: Accurate Mongoose connection states
        const states = { 0: "Disconnected", 1: "Healthy", 2: "Connecting", 3: "Disconnecting" };
        const dbStatus = states[mongoose.connection.readyState] || "Unknown";

        res.status(200).json({ users: totalUsers, problems: totalProblems, submissions: totalSubmissions, admins: adminCount, status: dbStatus });
    } catch (err) {
        res.status(500).json({ error: "Stats Error" });
    }
};

// 2. Get All Users (For the User Table)
const getAllUsers = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        if (page < 1) page = 1; // FIXED: Prevent negative skip math crash
        
        const limit = 10; 
        const skip = (page - 1) * limit;

        const [total, users] = await Promise.all([
            User.countDocuments(),
            User.find({}).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit)
        ]);

        res.status(200).json({ users, pagination: { total, page, pages: Math.ceil(total / limit) } });
    } catch (err) {
        res.status(500).send("Error fetching users");
    }
};

// 3. Ban/Unban User
const toggleBanUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send("Invalid ID");

        const user = await User.findById(id);
        if (!user) return res.status(404).send("User not found");
        if (user.role === 'admin') return res.status(403).send("Cannot ban an Admin");

        // FIXED: Atomic boolean toggle to prevent race conditions
        await User.updateOne(
            { _id: id },
            [{ $set: { isBanned: { $not: "$isBanned" } } }] 
        );

        res.status(200).json({ message: "User ban status toggled successfully" });
    } catch (err) {
        res.status(500).send("Error updating ban status");
    }
};

// 4. Update User Role (Promote/Demote)
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params; 
        const { role } = req.body; 

        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send("Invalid ID");

        const allowedRoles = ['user', 'admin', 'creator', 'tester'];
        if (!allowedRoles.includes(role)) return res.status(400).send("Invalid Role");

        if (req.result._id.toString() === id) {
            return res.status(403).send("You cannot change your own role.");
        }

        // FIXED: Added runValidators so Mongoose enforces schema rules
        const user = await User.findByIdAndUpdate(id, { role }, { new: true, runValidators: true });
        if (!user) return res.status(404).send("User not found");

        res.status(200).json({ message: `User role updated to ${role}` });
    } catch (err) {
        res.status(500).send("Error updating role");
    }
};

module.exports = { getSystemStats, getAllUsers, toggleBanUser, updateUserRole };