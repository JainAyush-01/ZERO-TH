const Submission = require('../models/submission');
const User = require('../models/user');
const Mastery = require('../models/mastery');
const runCode = require('../utils/codeRunner');
const Problem = require('../models/problem');

const submitAns = async (req, res) => {
    // We declare this outside try so we can access it in catch for error logging
    let submittedResult = null; 

    try {
        const userId = req.result._id;
        const problemId = req.params.id;
        const { code, language } = req.body;

        if (!userId || !problemId || !code || !language)
            return res.status(400).send("Data is Missing");

        const getProblem = await Problem.findById(problemId);
        if (!getProblem) return res.status(400).send("Problem Does not exists");

        // 1. SAVE "PENDING" STATE (Checkpoint 1)
        // If server dies immediately after this, we have a record that user tried.
        submittedResult = await Submission.create({
            userId,
            problemId,
            code,
            language,
            status: 'pending',
            testCasesTotal: getProblem.hiddenTestCases.length + getProblem.visibleTestCases.length
        });

        // 2. Prepare Execution
        const visibleTestCases = getProblem.visibleTestCases;
        const hiddenTestCases = getProblem.hiddenTestCases;
        const allTestCases = [...visibleTestCases, ...hiddenTestCases].map(tc => ({
            input: tc.input,
            expected: tc.output
        }));

        const driver = getProblem.driverCode.find(item => item.language === language);
        if (!driver) {
            // Update DB to error state before returning
            submittedResult.status = 'error';
            submittedResult.errorMessage = "Driver Missing";
            await submittedResult.save();
            return res.status(400).json({ success: false, message: `Driver missing for language: ${language}.` });
        }

        // 3. Run Code (The Heavy Operation)
        const validationResults = await runCode(code, driver.Code, language, allTestCases);

        // Check for Judge Server Failures
        const serverError = validationResults.find(result => result.statusId === 13);
        if (serverError) {
            submittedResult.status = 'error';
            submittedResult.errorMessage = "Judge Server Busy";
            await submittedResult.save();
            return res.status(503).json({ success: false, message: "Judge server busy.", type: "SERVER_BUSY" });
        }

        // 4. Analyze Results
        const passedCount = validationResults.filter(resu => resu.statusId === 3).length;
        const failedCase = validationResults.find(resu => resu.statusId != 3);

        let totalRuntime = 0;
        validationResults.forEach(item => { if (item.runtime) totalRuntime += parseFloat(item.runtime); });

        let status = 'accepted';
        if (failedCase) {
            if (failedCase.statusId == 6 || failedCase.statusId == 11) status = 'error';
            else if (failedCase.statusId == 5) status = 'TLE';
            else if (failedCase.statusId == 4) status = 'wrong';
        }

        // 5. SAVE FINAL RESULT (Checkpoint 2 - CRITICAL)
        // We save BEFORE updating User/Mastery. 
        // This ensures the user sees their result even if the profile update crashes.
        submittedResult.status = status;
        submittedResult.errorMessage = failedCase ? failedCase.error : "";
        submittedResult.testCasesPassed = passedCount;
        submittedResult.runtime = totalRuntime;
        
        await submittedResult.save(); 

        // 6. Secondary Updates (User & Mastery)
        // These are "Side Effects". If they fail, the submission is still valid.
        let inVault = false;

        if (status === 'accepted') {
            try {
                // A. Update User Profile
                await User.findByIdAndUpdate(userId, {
                    $addToSet: { problemSolved: problemId }
                });

                // B. Update Mastery Vault
                const masteryEntry = await Mastery.findOne({ userId, problemId });
                if (masteryEntry) {
                    inVault = true;
                } else {
                    const nextDay = new Date();
                    nextDay.setDate(nextDay.getDate() + 1);
                    
                    await Mastery.create({
                        userId,
                        problemId,
                        repetition: 1, 
                        interval: 1,   
                        easeFactor: 2.5,
                        nextReviewDate: nextDay,
                        lastReviewedAt: new Date()
                    });
                    inVault = true;
                }
            } catch (secondaryErr) {
                // Log this, but DO NOT crash the request. The user's code ran successfully.
                console.error("Secondary Update Failed:", secondaryErr);
            }
        }

        // 7. Send Response
        res.status(201).json({
            ...submittedResult.toObject(),
            errorDetails: failedCase ? failedCase : null,
            inVault: inVault
        });

    } catch (err) {
        console.error("Critical Submission Error:", err);
        
        // 8. FAILSAFE: Update DB to reflect the crash
        if (submittedResult) {
            try {
                submittedResult.status = 'error';
                submittedResult.errorMessage = "Internal Server Error during processing";
                await submittedResult.save();
            } catch (saveErr) {
                console.error("Could not save fallback error status", saveErr);
            }
        }

        res.status(500).send("Internal Server Error: " + err.message);
    }
}

const RunCode = async (req, res) => {
    try {
        const userId = req.result._id;
        const problemId = req.params.id;
        const { code, language, input } = req.body;

        if (!userId || !problemId || !code || !language)
            return res.status(400).send("Data is Missing");

        const getProblem = await Problem.findById(problemId);
        if (!getProblem) return res.status(400).send("Problem Does not exists");

        let allTestCases = [];
        
        if (input) {
            // CUSTOM INPUT MODE
            // We strip newlines to ensure clean input parsing
            allTestCases = [{ input: input.trim(), expected: "Custom Run" }]; 
        } else {
            // DEFAULT TEST CASES
            allTestCases = getProblem.visibleTestCases.map(tc => ({
                input: tc.input,
                expected: tc.output
            }));
        }
        
        const driver = getProblem.driverCode.find(item => item.language === language);
        if (!driver) {
            return res.status(400).json({ success: false, message: `Driver missing for language: ${language}.` });
        }

        // Run Code
        // Note: For Custom Input, we don't care about "Wrong Answer" status, we just want the output.
        // So we pass a flag or handle the result differently.
        const validationResults = await runCode(code, driver.Code, language, allTestCases);

        // If custom input, we force status to 'Accepted' if it ran, so the UI shows the output
        if (input && validationResults.length > 0) {
            validationResults[0].status = "Ran Successfully";
            // We clear the error if it was just a mismatch with "Custom Run" expected string
            if (validationResults[0].statusId === 4) {
                validationResults[0].statusId = 3; 
                validationResults[0].error = null;
            }
        }

        res.status(201).send(validationResults);
    }
    catch(err) {
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
// 2. Playground/Interview Runner (Raw Piston Execution)
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

// Add to exports
// ... existing imports

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

// Don't forget to export it!
module.exports = { 
    submitAns, 
    RunCode, 
    fetchUserHistory, 
    runPlayground, 
    getAllSubmissions, 
    getSubmissionById // <--- Added
};