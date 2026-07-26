const Contest = require('../models/contest');
const User = require('../models/user');
const Problem = require('../models/problem'); 
const Submission = require('../models/submission'); 
const { bulkJudge } = require('../utils/codeRunner');
const mongoose = require('mongoose');   

// 1. Create Contest
const createContest = async (req, res) => {
    try {
        const { title, description, startTime, endTime, problems } = req.body;
        if (!title || !startTime || !endTime) return res.status(400).send("Missing required fields");

        // FIXED: Date Validation
        if (new Date(startTime) >= new Date(endTime)) {
            return res.status(400).send("End time must be after start time");
        }

        const newContest = await Contest.create({
            title, description, startTime, endTime, problems, creator: req.result._id
        });
        res.status(201).json(newContest);
    } catch (err) {
        res.status(500).send("Error creating contest");
    }
};

// 2. Get All Contests
const getAllContests = async (req, res) => {
    try {
        const contests = await Contest.find({})
            .select('title startTime endTime status participants.length') 
            .sort({ startTime: 1 }); 

        const now = new Date();
        const updatedContests = contests.map(c => {
            let status = 'upcoming';
            if (now > c.endTime) status = 'ended';
            else if (now >= c.startTime && now <= c.endTime) status = 'active';
            return { ...c.toObject(), status }; 
        });

        res.status(200).json(updatedContests);
    } catch (err) {
        res.status(500).send("Error fetching contests");
    }
};

// 3. Register for Contest (User)
const registerForContest = async (req, res) => {
    try {
        const { id } = req.params; 
        const userId = req.result._id;

        // FIXED: Atomic array insertion (prevents Race Condition double-registration)
        const contest = await Contest.findOneAndUpdate(
            { 
                _id: id, 
                endTime: { $gt: new Date() }, // Only if contest hasn't ended
                'participants.userId': { $ne: userId } // Only if user is NOT already in array
            },
            { $push: { participants: { userId } } },
            { new: true }
        );

        if (!contest) return res.status(400).send("Contest ended, not found, or you are already registered.");

        res.status(200).send("Registered successfully");
    } catch (err) {
        res.status(500).send("Error registering");
    }
};

const getContestById = async (req, res) => { /* Code remains exactly the same as you had it, it was good */ };

// 4. Submit & Score Contest Solution
const submitContestSolution = async (req, res) => {
    // START TRANSACTION SESSION
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { contestId, problemId, code, language } = req.body;
        const userId = req.result._id;

        const contest = await Contest.findById(contestId).session(session);
        if (!contest) throw new Error("Contest not found");

        const now = new Date();
        if (now < contest.startTime || now > contest.endTime) throw new Error("Contest is not active");

        const participantIndex = contest.participants.findIndex(p => p.userId.toString() === userId.toString());
        if (participantIndex === -1) throw new Error("Not registered");

        const participant = contest.participants[participantIndex];
        const existingProgress = participant.submissionHistory.find(h => h.problemId.toString() === problemId);
        
        if (existingProgress && existingProgress.status === 'solved') throw new Error("Problem already solved");

        const contestProblem = contest.problems.find(p => p.problemId.toString() === problemId);
        const problemPoints = contestProblem.points; 

        const problem = await Problem.findById(problemId).session(session); 
        const testCases = [...problem.visibleTestCases, ...problem.hiddenTestCases].map(tc => ({ input: tc.input, expected: tc.output }));

        const driver = problem.driverCode.find(d => d.language === language);
        const results = await bulkJudge(code, driver.Code, language, testCases);
        
        const isAccepted = results.every(r => r.statusId === 3);
        const failedCase = results.find(r => r.statusId !== 3);

        let penaltyUpdate = 0; let scoreUpdate = 0; let statusUpdate = 'attempted'; let failCountIncrement = 0;

        if (isAccepted) {
            statusUpdate = 'solved';
            scoreUpdate = problemPoints;
            const minutesTaken = Math.floor((now - contest.startTime) / 60000);
            const prevFails = existingProgress ? existingProgress.failCount : 0;
            penaltyUpdate = minutesTaken + (prevFails * 5); 
        } else {
            failCountIncrement = 1;
        }

        if (!existingProgress) {
            contest.participants[participantIndex].submissionHistory.push({
                problemId, status: statusUpdate, failCount: failCountIncrement, solvedAt: isAccepted ? now : null
            });
        } else {
            const histIndex = contest.participants[participantIndex].submissionHistory.findIndex(h => h.problemId.toString() === problemId);
            contest.participants[participantIndex].submissionHistory[histIndex].status = statusUpdate;
            contest.participants[participantIndex].submissionHistory[histIndex].failCount += failCountIncrement;
            if (isAccepted) contest.participants[participantIndex].submissionHistory[histIndex].solvedAt = now;
        }

        if (isAccepted) {
            contest.participants[participantIndex].score += scoreUpdate;
            contest.participants[participantIndex].timePenalty += penaltyUpdate;
        }

        // FIXED: Atomicity using MongoDB Transactions!
        await contest.save({ session });
        await Submission.create([{
            userId, problemId, code, language, 
            status: isAccepted ? 'accepted' : 'wrong',
            testCasesPassed: results.filter(r => r.statusId === 3).length,
            testCasesTotal: testCases.length,
            runtime: results.reduce((acc, c) => acc + (c.runtime||0), 0)
        }], { session });

        await session.commitTransaction(); // Commit both to Database safely!
        session.endSession();

        // (Sanitize error code remains exactly the same here)
        res.status(200).json({ status: isAccepted ? 'Accepted' : 'Failed', score: contest.participants[participantIndex].score });

    } catch (err) {
        await session.abortTransaction(); // If ANYTHING fails, rollback the database!
        session.endSession();
        res.status(400).send(err.message || "Contest Engine Error");
    }
};

// 5. Get Live Leaderboard
const getContestLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send("Invalid ID");

        // FIXED: Offloaded ALL Sorting and RAM usage to MongoDB via Aggregation Pipeline!
        const leaderboard = await Contest.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } }, // Find the contest
            { $unwind: "$participants" }, // Break the array into individual participant documents
            { $sort: { "participants.score": -1, "participants.timePenalty": 1 } }, // Sort inside the DB!
            { 
                $lookup: { // Like a SQL JOIN, get the user info
                    from: 'users', 
                    localField: 'participants.userId', 
                    foreignField: '_id', 
                    as: 'user' 
                } 
            },
            { $unwind: "$user" },
            { 
                $project: { // Only send exact fields needed
                    _id: 0,
                    userId: "$user._id",
                    name: "$user.firstName",
                    email: "$user.emailId",
                    score: "$participants.score",
                    timePenalty: "$participants.timePenalty"
                }
            }
        ]);

        res.status(200).json(leaderboard);
    } catch (err) {
        res.status(500).send("Error fetching ranklist");
    }
};

module.exports = { createContest, getAllContests, registerForContest, getContestById, submitContestSolution, getContestLeaderboard };