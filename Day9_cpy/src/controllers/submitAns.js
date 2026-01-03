const Submission = require('../models/submission');
const runCode = require('../utils/codeRunner');
const Problem = require('../models/problem');
const User = require('../models/user');

const submitAns = async(req , res)=>{

    try
    {
        const userId = req.result._id;
        const problemId = req.params.id;

        const {code , language} = req.body;

        if(!userId || !problemId || !code || !language)
            return res.status(400).send("Data is Missing");

        const getProblem = await Problem.findById(problemId);

        if(!getProblem)
            return res.status(400).send("Problem Does not exists");

        const submittedResult = await Submission.create({

            userId,
            problemId,
            code,
            language,
            status : 'pending',
            testCasesTotal : getProblem.hiddenTestCases.length + getProblem.visibleTestCases.length
        })

        const visibleTestCases = getProblem.visibleTestCases;
        const hiddenTestCases = getProblem.hiddenTestCases;

        const allTestCases = [...visibleTestCases, ...hiddenTestCases].map(tc => ({
            input: tc.input,
            expected: tc.output
        }));       
        
        const lang = language;
        const driver = getProblem.driverCode.find(item => item.language === lang);
        
        if (!driver) {
            return res.status(400).json({ 
                success: false, 
                message: `Driver missing for language: ${lang}.` 
            });
        }

        // Execute the code using your bulkJudge utility
        const validationResults = await runCode(code, driver.Code, lang, allTestCases);

        // 1. Check for Server/Internal Error (Status 13)
        const serverError = validationResults.find(result => result.statusId === 13);
        if (serverError) {
            return res.status(503).json({
                success: false,
                message: "Judge server is busy. Reference solution check failed. Retry later.",
                type: "SERVER_BUSY"
            });
        }

        const passedCount = validationResults.filter(resu => resu.statusId === 3).length;
        const failedCase = validationResults.filter(resu => resu.statusId != 3); 

        let totalRuntime = 0;

        validationResults.forEach(item => {
            if (item.runtime) {
                totalRuntime += parseFloat(item.runtime);
            }
        });

        let errorMessage = failedCase.length != 0 ? failedCase[0].error : "";
        let status = 'accepted';

        if(failedCase.length != 0)
        {
            if(failedCase[0].statusId == 6 || failedCase[0].statusId == 11)
                status = 'error';
            else if(failedCase[0].statusId == 5)
                status = 'TLE'
            else if(failedCase[0].statusId == 4)
                status = 'wrong';
        }

        //Store in database
        submittedResult.status = status;
        submittedResult.errorMessage = errorMessage;
        submittedResult.testCasesPassed = passedCount;
        submittedResult.runtime = totalRuntime;
        
        await submittedResult.save();

        if (status === 'accepted') {

            await User.findByIdAndUpdate(userId, {
                $addToSet: { problemSolved: problemId }
            });
        }

        await submittedResult.save();

        // 5. Update User Profile ONLY if Accepted
        if(status === 'accepted') {
            await User.findByIdAndUpdate(userId, {
                $addToSet: { problemSolved: problemId }
            });
        }

        // --- NEW RETURN LOGIC ---
        // Send back the submission AND the first failed test case details
        const responsePayload = {
            ...submittedResult.toObject(),
            errorDetails: failedCase.length > 0 ? failedCase[0] : null
        };

        res.status(201).json(responsePayload);
    }
    catch(err)
    {
        res.status(500).send("Internal Server Error " + err);
    }
}

const RunCode = async (req , res)=>{

    try
    {
        const userId = req.result._id;
        const problemId = req.params.id;

        const {code , language} = req.body;

        if(!userId || !problemId || !code || !language)
            return res.status(400).send("Data is Missing");

        const getProblem = await Problem.findById(problemId);

        if(!getProblem)
            return res.status(400).send("Problem Does not exists");

        const visibleTestCases = getProblem.visibleTestCases;

        const allTestCases = [...visibleTestCases].map(tc => ({
            input: tc.input,
            expected: tc.output
        }));       
        
        const lang = language;
        const driver = getProblem.driverCode.find(item => item.language === lang);
        
        if (!driver) {
            return res.status(400).json({ 
                success: false, 
                message: `Driver missing for language: ${lang}.` 
            });
        }

        // Execute the code using your bulkJudge utility
        const validationResults = await runCode(code, driver.Code, lang, allTestCases , { stopOnError: false });

        // 1. Check for Server/Internal Error (Status 13)
        const serverError = validationResults.find(result => result.statusId === 13);
        if (serverError) {
            return res.status(503).json({
                success: false,
                message: "Judge server is busy. Reference solution check failed. Retry later.",
                type: "SERVER_BUSY"
            });
        }

        // const passedCount = validationResults.filter(resu => resu.statusId === 3).length;
        // const failedCase = validationResults.filter(resu => resu.statusId != 3); 

        // let totalRuntime = 0;

        // validationResults.forEach(item => {
        //     if (item.runtime) {
        //         totalRuntime += parseFloat(item.runtime);
        //     }
        // });

        // let errorMessage = failedCase.length != 0 ? failedCase[0].error : "";
        // let status = 'accepted';

        // if(failedCase.length != 0)
        // {
        //     if(failedCase[0].statusId == 6 || failedCase[0].statusId == 11)
        //         status = 'error';
        //     else if(failedCase[0].statusId == 5)
        //         status = 'TLE'
        //     else if(failedCase[0].statusId == 4)
        //         status = 'wrong';
        // }

        res.status(201).send(validationResults);
    }
    catch(err)
    {
        res.status(500).send("Internal Server Error " + err);
    }
}

const fetchUserHistory = async (req, res) => {
    try {
        const userId = req.result._id;
        
        // Find all submissions by this user
        const history = await Submission.find({ userId: userId }) // Mongoose auto-casts this usually
            .sort({ createdAt: -1 }) // Newest first
            .limit(10)
            .populate('problemId', 'title difficulty'); // Ensure 'problemId' matches your Problem model Ref name

        // DEBUGGING: If history is empty, check if we have ANY submissions
        if (history.length === 0) {
             console.log(`No history found for User: ${userId}`);
        }

        res.status(200).json(history);
    } catch (err) {
        console.error("History Error:", err);
        res.status(500).send("Error fetching history");
    }
}

// 2. Playground Runner (Raw Piston Execution)
const runPlayground = async (req, res) => {
    try {
        const { code, language } = req.body;
        
        // Basic mapping for Piston
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
                files: [{ name: config.fileName, content: code }]
            })
        });

        const data = await response.json();
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

// Add to exports
module.exports = { 
    submitAns, 
    RunCode, 
    fetchUserHistory, 
    runPlayground, 
    getAllSubmissions // <--- Export this
};