const Contest = require('../models/contest');
const User = require('../models/user');
const problem = require('../models/problem')
const { bulkJudge } = require('../utils/codeRunner');
const mongoose = require('mongoose');   

// 1. Create Contest (Admin/Creator only)
const createContest = async (req, res) => {
    try {
        const { title, description, startTime, endTime, problems } = req.body;

        if (!title || !startTime || !endTime) {
            return res.status(400).send("Missing required fields");
        }

        const newContest = await Contest.create({
            title,
            description,
            startTime,
            endTime,
            problems,
            creator: req.result._id
        });

        res.status(201).json(newContest);
    } catch (err) {
        res.status(500).send("Error creating contest: " + err.message);
    }
};

// 2. Get All Contests (Public)
const getAllContests = async (req, res) => {
    try {
        const contests = await Contest.find({})
            .select('title startTime endTime status participants.length') // Lightweight
            .sort({ startTime: 1 }); // Soonest first

        // Calculate status dynamically (Optional, but good for UI)
        const now = new Date();
        const updatedContests = contests.map(c => {
            let status = 'upcoming';
            if (now > c.endTime) status = 'ended';
            else if (now >= c.startTime && now <= c.endTime) status = 'active';
            
            return { ...c.toObject(), status }; // Return computed status
        });

        res.status(200).json(updatedContests);
    } catch (err) {
        res.status(500).send("Error fetching contests");
    }
};

// 3. Register for Contest (User)
const registerForContest = async (req, res) => {
    try {
        const { id } = req.params; // Contest ID
        const userId = req.result._id;

        const contest = await Contest.findById(id);
        if (!contest) return res.status(404).send("Contest not found");

        if (new Date() > contest.endTime) {
            return res.status(400).send("Contest has ended");
        }

        // Check if already registered
        const isRegistered = contest.participants.some(p => p.userId.toString() === userId.toString());
        if (isRegistered) {
            return res.status(400).send("Already registered");
        }

        contest.participants.push({ userId });
        await contest.save();

        res.status(200).send("Registered successfully");
    } catch (err) {
        res.status(500).send("Error registering");
    }
};

// ... existing imports

const getContestById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.result._id;

        // 1. VALIDATE ID FORMAT (Prevents System Error 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).send("Contest not found");
        }

        const contest = await Contest.findById(id).populate('problems', 'title difficulty');
        
        // 2. CHECK IF EXISTS
        if (!contest) return res.status(404).send("Contest not found");

        const now = new Date();
        const hasStarted = now >= contest.startTime;
        const participant = contest.participants.find(p => p.userId.toString() === userId.toString());
        const isRegistered = !!participant;

        let problemsToSend = [];
        if (hasStarted && isRegistered) {
            problemsToSend = contest.problems;
        } else if (req.result.role === 'admin') {
            problemsToSend = contest.problems;
        }

        res.status(200).json({
            contest: {
                title: contest.title,
                description: contest.description,
                startTime: contest.startTime,
                endTime: contest.endTime,
                status: now > contest.endTime ? 'ended' : hasStarted ? 'active' : 'upcoming',
                problems: problemsToSend
            },
            isRegistered
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching contest");
    }
};

// 4. Submit & Score Contest Solution
const submitContestSolution = async (req, res) => {
    try {
        const { contestId, problemId, code, language } = req.body;
        const userId = req.result._id;

        // A. Validate Contest & Time
        const contest = await Contest.findById(contestId);
        if (!contest) return res.status(404).send("Contest not found");

        const now = new Date();
        if (now < contest.startTime || now > contest.endTime) {
            return res.status(400).send("Contest is not active");
        }

        // B. Check Registration
        const participantIndex = contest.participants.findIndex(p => p.userId.toString() === userId.toString());
        if (participantIndex === -1) return res.status(403).send("Not registered");

        // C. Check Previous Status
        const participant = contest.participants[participantIndex];
        const existingProgress = participant.submissionHistory.find(h => h.problemId.toString() === problemId);
        
        if (existingProgress && existingProgress.status === 'solved') {
            return res.status(400).send("Problem already solved");
        }

        const contestProblem = contest.problems.find(p => p.problemId.toString() === problemId);
        if (!contestProblem) return res.status(400).send("Problem not part of this contest");
        
        const problemPoints = contestProblem.points; // <--- DYNAMIC POINTS

        // D. Run Code
        const problem = await problem.findById(problemId);
        const testCases = [...problem.visibleTestCases, ...problem.hiddenTestCases].map(tc => ({
            input: tc.input,
            expected: tc.output
        }));

        const driver = problem.driverCode.find(d => d.language === language);
        if(!driver) return res.status(400).send("Driver missing");

        const results = await bulkJudge(code, driver.Code, language, testCases);
        
        const isAccepted = results.every(r => r.statusId === 3);
        const failedCase = results.find(r => r.statusId !== 3);

        // E. Calculate Penalties & Score
        let penaltyUpdate = 0;
        let scoreUpdate = 0;
        let statusUpdate = 'attempted';
        let failCountIncrement = 0;

        if (isAccepted) {
            statusUpdate = 'solved';
            
            scoreUpdate = problemPoints;

            // Time Penalty
            const minutesTaken = Math.floor((now - contest.startTime) / 60000);
            const prevFails = existingProgress ? existingProgress.failCount : 0;
            
            // Standard ICPC Penalty: Time + (20 mins * Wrong). 
            // LeetCode usually does Time + (5 mins * Wrong).
            penaltyUpdate = minutesTaken + (prevFails * 5); 
        } else {
            failCountIncrement = 1;
        }

        // F. Update Database (Same as before)
        if (!existingProgress) {
            contest.participants[participantIndex].submissionHistory.push({
                problemId,
                status: statusUpdate,
                failCount: failCountIncrement,
                solvedAt: isAccepted ? now : null
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

        await contest.save();

        // G. Log Global Submission
        await Submission.create({
            userId, problemId, code, language, 
            status: isAccepted ? 'accepted' : 'wrong',
            testCasesPassed: results.filter(r => r.statusId === 3).length,
            testCasesTotal: testCases.length,
            runtime: results.reduce((acc, c) => acc + (c.runtime||0), 0)
        });

        let sanitizedError = null;

        if (failedCase) {
            // Check if this input matches any VISIBLE test case
            const isVisible = problem.visibleTestCases.some(vtc => vtc.input.trim() === failedCase.input.trim());
            
            if (isVisible) {
                // Allowed to see details (It's a sample case)
                sanitizedError = failedCase;
            } else {
                // HIDDEN CASE: Censored Response
                sanitizedError = {
                    statusId: failedCase.statusId,
                    status: failedCase.status, // e.g., "Wrong Answer" or "TLE"
                    testCase: failedCase.testCase,
                    
                    input: "Hidden Test Case",
                    expected: "Hidden",
                    actual: "Hidden",
                    error: "Output hidden during contest"
                };
            }
        }

        res.status(200).json({
            status: isAccepted ? 'Accepted' : 'Failed',
            errorDetails: sanitizedError, // Send the sanitized version
            score: contest.participants[participantIndex].score
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Contest Engine Error");
    }
};

// ... existing imports

// 5. Get Live Leaderboard
const getContestLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;
        
        const contest = await Contest.findById(id)
            .select('participants title')
            .populate('participants.userId', 'firstName emailId');

        if (!contest) return res.status(404).send("Contest not found");

        // SORTING LOGIC:
        // 1. Higher Score wins.
        // 2. If Score equals, Lower TimePenalty wins.
        const leaderboard = contest.participants
            .map(p => ({
                userId: p.userId._id,
                name: p.userId.firstName,
                email: p.userId.emailId,
                score: p.score,
                timePenalty: p.timePenalty,
                finishTime: p.finishTime
            }))
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score; // Higher score first
                return a.timePenalty - b.timePenalty; // Lower penalty first
            });

        res.status(200).json(leaderboard);

    } catch (err) {
        res.status(500).send("Error fetching ranklist");
    }
};

module.exports = { 
    createContest, 
    getAllContests, 
    registerForContest, 
    getContestById, 
    submitContestSolution,
    getContestLeaderboard // <--- Export
};