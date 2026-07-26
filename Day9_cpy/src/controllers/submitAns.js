const Submission = require('../models/submission');
const User = require('../models/user');
const Mastery = require('../models/mastery');
const runCode = require('../utils/codeRunner');
const Problem = require('../models/problem');

const CODE_STATUS = {
    ACCEPTED: 3,
    WRONG_ANSWER: 4,
    TIME_LIMIT_EXCEEDED: 5,
    COMPILATION_ERROR: 6,
    RUNTIME_ERROR: 11,
    SERVER_ERROR: 13
};

const submitAns = async (req, res) => {
    let submittedResult = null; 

    try {
        const userId = req.result._id;
        const problemId = req.params.id;
        const { code, language } = req.body;

        if (!userId || !problemId || !code || !language)
            return res.status(400).send("Data is Missing");

        const getProblem = await Problem.findById(problemId);
        if (!getProblem) return res.status(400).send("Problem Does not exists");

        // 1. Checkpoint 1: Save Pending
        submittedResult = await Submission.create({
            userId, problemId, code, language, status: 'pending',
            testCasesTotal: getProblem.hiddenTestCases.length + getProblem.visibleTestCases.length
        });

        // 2. Prepare Execution
        const allTestCases = [...getProblem.visibleTestCases, ...getProblem.hiddenTestCases].map(tc => ({
            input: tc.input, expected: tc.output
        }));

        const driver = getProblem.driverCode.find(item => item.language === language);
        if (!driver) {
            submittedResult.status = 'error';
            submittedResult.errorMessage = "Driver Missing";
            await submittedResult.save();
            return res.status(400).json({ success: false, message: `Driver missing.` });
        }

        
        const validationResults = await runCode(code, driver.Code, language, allTestCases);

        const serverError = validationResults.find(result => result.statusId === CODE_STATUS.SERVER_ERROR);
        if (serverError) {
            submittedResult.status = 'error';
            submittedResult.errorMessage = "Judge Server Busy";
            await submittedResult.save();
            return res.status(503).json({ success: false, message: "Judge server busy.", type: "SERVER_BUSY" });
        }

        // 4. Analyze Results
        const passedCount = validationResults.filter(resu => resu.statusId === CODE_STATUS.ACCEPTED).length;
        const failedCase = validationResults.find(resu => resu.statusId !== CODE_STATUS.ACCEPTED);

        let totalRuntime = 0;
        validationResults.forEach(item => { if (item.runtime) totalRuntime += parseFloat(item.runtime); });

        let status = 'accepted';
        if (failedCase) {
            if (failedCase.statusId === CODE_STATUS.COMPILATION_ERROR || failedCase.statusId === CODE_STATUS.RUNTIME_ERROR) status = 'error';
            else if (failedCase.statusId === CODE_STATUS.TIME_LIMIT_EXCEEDED) status = 'TLE';
            else if (failedCase.statusId === CODE_STATUS.WRONG_ANSWER) status = 'wrong';
        }

        // 5. Checkpoint 2: Save Final
        submittedResult.status = status;
        submittedResult.errorMessage = failedCase ? failedCase.error : "";
        submittedResult.testCasesPassed = passedCount;
        submittedResult.runtime = totalRuntime;
        await submittedResult.save(); 

        let inVault = false;
        if (status === 'accepted') {
            try {
         
                await User.findByIdAndUpdate(userId, { $addToSet: { problemSolved: problemId } });

                const masteryEntry = await Mastery.findOne({ userId, problemId });
                if (masteryEntry) {
                    inVault = true;
                } else {
                    const nextDay = new Date(); nextDay.setDate(nextDay.getDate() + 1);
                    await Mastery.create({
                        userId, problemId, repetition: 1, interval: 1, easeFactor: 2.5,
                        nextReviewDate: nextDay, lastReviewedAt: new Date()
                    });
                    inVault = true;
                }
            } catch (secondaryErr) {
                console.error("Secondary Update Failed:", secondaryErr);
            }
        }

        res.status(201).json({
            ...submittedResult.toObject(),
            errorDetails: failedCase ? failedCase : null,
            inVault: inVault
        });

    } catch (err) {
        if (submittedResult) {
            submittedResult.status = 'error';
            submittedResult.errorMessage = "Internal Server Error";
            await submittedResult.save();
        }
        res.status(500).send("Internal Server Error: " + err.message);
    }
}

// FIXED: Added Pagination and Note on Indexing
const fetchUserHistory = async (req, res) => {
    try {
        const userId = req.result._id;
        let page = parseInt(req.query.page) || 1;
        if (page < 1) page = 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        
        /* Note: Ensure MongoDB has a compound index: { userId: 1, createdAt: -1 } */
        const history = await Submission.find({ userId: userId }) 
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit)
            .populate('problemId', 'title difficulty'); 

        res.status(200).json(history);
    } catch (err) {
        res.status(500).send("Error fetching history");
    }
}


// 2. Playground Runner (Raw Piston Execution)
const runPlayground = async (req, res) => {
    try {
        const { code, language, stdin } = req.body; // <--- Capture stdin
        
        const langConfig = {
            cpp: { version: "10.2.0", fileName: "main.cpp" },
            java: { version: "15.0.2", fileName: "Main.java" },
            python: { version: "3.10.0", fileName: "main.py" },
            javascript: { version: "18.15.0", fileName: "main.js" }
        };

        const config = langConfig[language];
        if(!config) return res.status(400).send("Unsupported Language");

        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                language: language,
                version: config.version,
                files: [{ name: config.fileName, content: code }],
                stdin: stdin || "" // <--- PASS INPUT TO PISTON
            })
        });

        const data = await response.json();
        
        // Return stdout or stderr
        res.status(200).send(data.run);
    } catch (err) {
        res.status(500).send("Playground Error: " + err.message);
    }
}
// ADMIN: Fetch all submissions (Global History)
const getAllSubmissions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20; // Show 20 logs per page
        const skip = (page - 1) * limit;

        const total = await Submission.countDocuments(); // Count total logs

        const submissions = await Submission.find({})
            .sort({ createdAt: -1 })
            .skip(skip) // Pagination Logic
            .limit(limit)
            .populate('userId', 'firstName emailId')
            .populate('problemId', 'title');

        res.status(200).json({
            submissions,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching logs");
    }
}

const getSubmissionById = async (req, res) => {
    try {
        const { id } = req.params;
        const submission = await Submission.findById(id).populate('problemId', 'title');
        
        if (!submission) return res.status(404).send("Submission not found");
        
        // Security check: Ensure user owns this submission (or is admin)
        if (submission.userId.toString() !== req.result._id.toString() && req.result.role !== 'admin') {
            return res.status(403).send("Unauthorized");
        }

        res.status(200).json(submission);
    } catch (err) {
        res.status(500).send("Error fetching submission");
    }
}

module.exports = { 
    submitAns, 
    RunCode, 
    fetchUserHistory, 
    runPlayground, 
    getAllSubmissions, 
    getSubmissionById 
};