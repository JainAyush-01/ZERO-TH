const Contest = require('../models/contest');
const User = require('../models/user');
const Problem = require('../models/problem'); 
const Submission = require('../models/submission'); 
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

        const contest = await Contest.findById(id);
        if (!contest) return res.status(404).send("Contest not found");

        if (new Date() > contest.endTime) {
            return res.status(400).send("Contest has ended");
        }

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

const getContestById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.result._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).send("Contest not found");
        }

        const contest = await Contest.findById(id).populate('problems', 'title difficulty');
        
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

        const contest = await Contest.findById(contestId);
        if (!contest) return res.status(404).send("Contest not found");

        const now = new Date();
        if (now < contest.startTime || now > contest.endTime) {
            return res.status(400).send("Contest is not active");
        }

        const participantIndex = contest.participants.findIndex(p => p.userId.toString() === userId.toString());
        if (participantIndex === -1) return res.status(403).send("Not registered");

        const participant = contest.participants[participantIndex];
        const existingProgress = participant.submissionHistory.find(h => h.problemId.toString() === problemId);
        
        if (existingProgress && existingProgress.status === 'solved') {
            return res.status(400).send("Problem already solved");
        }

        const contestProblem = contest.problems.find(p => p.problemId.toString() === problemId);
        if (!contestProblem) return res.status(400).send("Problem not part of this contest");
        
        const problemPoints = contestProblem.points; 

        // <--- CORRECT: Uppercase Model, lowercase instance
        const problem = await Problem.findById(problemId); 
        
        const testCases = [...problem.visibleTestCases, ...problem.hiddenTestCases].map(tc => ({
            input: tc.input,
            expected: tc.output
        }));

        const driver = problem.driverCode.find(d => d.language === language);
        if(!driver) return res.status(400).send("Driver missing");

        const results = await bulkJudge(code, driver.Code, language, testCases);
        
        const isAccepted = results.every(r => r.statusId === 3);
        const failedCase = results.find(r => r.statusId !== 3);

        let penaltyUpdate = 0;
        let scoreUpdate = 0;
        let statusUpdate = 'attempted';
        let failCountIncrement = 0;

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
                problemId, status: statusUpdate, failCount: failCountIncrement,
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

        await Submission.create({
            userId, problemId, code, language, 
            status: isAccepted ? 'accepted' : 'wrong',
            testCasesPassed: results.filter(r => r.statusId === 3).length,
            testCasesTotal: testCases.length,
            runtime: results.reduce((acc, c) => acc + (c.runtime||0), 0)
        });

        let sanitizedError = null;
        if (failedCase) {
            const isVisible = problem.visibleTestCases.some(vtc => vtc.input.trim() === failedCase.input.trim());
            if (isVisible) {
                sanitizedError = failedCase;
            } else {
                sanitizedError = {
                    statusId: failedCase.statusId,
                    status: failedCase.status, 
                    testCase: failedCase.testCase,
                    input: "Hidden Test Case", expected: "Hidden",
                    actual: "Hidden", error: "Output hidden during contest"
                };
            }
        }

        res.status(200).json({
            status: isAccepted ? 'Accepted' : 'Failed',
            errorDetails: sanitizedError, 
            score: contest.participants[participantIndex].score
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Contest Engine Error");
    }
};

// 5. Get Live Leaderboard
const getContestLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;
        
        const contest = await Contest.findById(id)
            .select('participants title')
            .populate('participants.userId', 'firstName emailId');

        if (!contest) return res.status(404).send("Contest not found");

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
                if (b.score !== a.score) return b.score - a.score; 
                return a.timePenalty - b.timePenalty; 
            });

        res.status(200).json(leaderboard);

    } catch (err) {
        res.status(500).send("Error fetching ranklist");
    }
};

module.exports = { 
    createContest, getAllContests, registerForContest, 
    getContestById, submitContestSolution, getContestLeaderboard 
};