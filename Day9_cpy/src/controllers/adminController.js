const User = require('../models/user');
const Problem = require('../models/problem');
const Submission = require('../models/submission');
const mongoose = require('mongoose');

// 1. Get System Stats (Dashboard Overview)
const getSystemStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProblems = await Problem.countDocuments();
        const totalSubmissions = await Submission.countDocuments();
        const adminCount = await User.countDocuments({ role: 'admin' });
        
        // Check DB Status
        const dbStatus = mongoose.connection.readyState === 1 ? "Healthy" : "Disconnecting";

        res.status(200).json({
            users: totalUsers,
            problems: totalProblems,
            submissions: totalSubmissions,
            admins: adminCount,
            status: dbStatus
        });
    } catch (err) {
        res.status(500).send("Stats Error");
    }
};

// 2. Get All Users (For the User Table)
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // 10 Users per page
        const skip = (page - 1) * limit;

        const total = await User.countDocuments(); // Total count for math

        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            users,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).send("Error fetching users");
    }
};

// 3. Ban/Unban User
const toggleBanUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        
        if (!user) return res.status(404).send("User not found");
        if (user.role === 'admin') return res.status(403).send("Cannot ban an Admin");

        user.isBanned = !user.isBanned;
        await user.save();

        res.status(200).json({ message: `User ${user.isBanned ? 'Banned' : 'Activated'}`, isBanned: user.isBanned });
    } catch (err) {
        res.status(500).send("Error updating ban status");
    }
};

// ... existing imports

// 4. Update User Role (Promote/Demote)
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params; // User ID to update
        const { role } = req.body; // New Role (e.g., 'creator')

        const allowedRoles = ['user', 'admin', 'creator', 'tester'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).send("Invalid Role");
        }

        // SAFETY: Prevent Admin from changing their own role via this API
        // req.result._id comes from the validateAdmin middleware (the logged in admin)
        if (req.result._id.toString() === id) {
            return res.status(403).send("You cannot change your own role.");
        }

        const user = await User.findByIdAndUpdate(id, { role }, { new: true });
        
        if (!user) return res.status(404).send("User not found");

        res.status(200).json({ message: `User role updated to ${role}` });
    } catch (err) {
        res.status(500).send("Error updating role");
    }
};

module.exports = { getSystemStats, getAllUsers, toggleBanUser, updateUserRole }; // <--- Add export