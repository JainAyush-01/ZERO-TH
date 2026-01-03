const Problem = require('../models/problem');
const runCode = require('../utils/codeRunner');
const User = require('../models/user');
const Submission = require('../models/submission');

const createProblem = async (req, res) => {
    // 1. Destructure req.body
    const {
        title,
        description,
        difficulty,
        tags,
        visibleTestCases,
        hiddenTestCases,
        startCode,
        referenceSolution,
        driverCode,status, visibility
    } = req.body;

    try {
        // --- A. MANUAL VALIDATION (Important before hitting API) ---
        if (!title || !description || !referenceSolution || !driverCode) {
            return res.status(400).json({
                success: false,
                message: "Incomplete Data"
            });
        }

        // --- B. TEST CASE PREPARATION ---
        const allTestCases = [...visibleTestCases, ...hiddenTestCases].map(tc => ({
            input: tc.input,
            expected: tc.output
        }));

        // --- C. REFERENCE SOLUTION VALIDATION ---
        for (const sol of referenceSolution) {
            const lang = sol.language;
            const driver = driverCode.find(d => d.language === lang);
            
            if (!driver) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Driver missing for language: ${lang}. Please add it.` 
                });
            }

            // Execute the code using your bulkJudge utility
            const validationResults = await runCode(sol.CompleteCode, driver.Code, lang, allTestCases);

            // 1. Check for Server/Internal Error (Status 13)
            const serverError = validationResults.find(result => result.statusId === 13);
            if (serverError) {
                return res.status(503).json({
                    success: false,
                    message: "Judge server is busy. Reference solution check failed. Retry later.",
                    type: "SERVER_BUSY"
                });
            }

            // 2. Check for Logical Errors in Reference Solution (WA, TLE, RE, CE)
            const failedCase = validationResults.find(result => result.statusId !== 3);
            if (failedCase) {
                return res.status(422).json({
                    success: false,
                    message: `Reference solution is incorrect for ${lang}. Fix your code before saving.`,
                    errorDetails: {
                        status: failedCase.status,
                        testCase: failedCase.testCase,
                        expected: failedCase.expected,
                        actual: failedCase.actual,
                        compileError: failedCase.error
                    }
                });
            }
        }

        // --- D. SAVE TO DATABASE ---
        await Problem.create({
            ...req.body,
            status: status || 'draft',
            visibility: visibility || 'public',
            author: req.result._id, // Save the Creator's ID
            problemCreator: req.result._id // Keep backward compatibility if you used this field before
        });

        return res.status(201).send("Problem Created Successfully");

    } catch (err) {
        // --- E. GLOBAL ERROR HANDLING ---
        console.error("Critical Error:", err);

        // 1. Mongoose Duplicate Key (Title already exists)
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Title already exists"
            });
        }

        // 2. Mongoose Validation Error (Schema fields mismatch)
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: "Invalid Data",
                errors: messages
            });
        }

        // 3. Cast Error (Invalid ObjectId)
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: "Invalid ID format provided."
            });
        }

        // 4. Default 500 Error
        return res.status(500).json({
            success: false,
            message: "Internal Server Error.",
            error: err.message
        });
    }
};

const updateProblem = async(req , res)=>{

    const {id} = req.params;
    const {
        title,
        description,
        difficulty,
        tags,
        visibleTestCases,
        hiddenTestCases,
        startCode,
        referenceSolution,
        driverCode
    } = req.body;

    try {
        // --- A. MANUAL VALIDATION (Important before hitting API) ---

        if(!id)
            return res.status(400).send("Missing Id Field");

        const dsaProblem = await Problem.findById(id);
        if(!dsaProblem)
            return res.status(404).send("Id is invalid");

        if (!title || !description || !referenceSolution || !driverCode) {
            return res.status(400).json({
                success: false,
                message: "Incomplete Data"
            });
        }

        // --- B. TEST CASE PREPARATION ---
        const allTestCases = [...visibleTestCases, ...hiddenTestCases].map(tc => ({
            input: tc.input,
            expected: tc.output
        }));

        // --- C. REFERENCE SOLUTION VALIDATION ---
        for (const sol of referenceSolution) {
            const lang = sol.language;
            const driver = driverCode.find(d => d.language === lang);
            
            if (!driver) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Driver missing for language: ${lang}. Please add it.` 
                });
            }

            // Execute the code using your bulkJudge utility
            const validationResults = await runCode(sol.CompleteCode, driver.Code, lang, allTestCases);

            // 1. Check for Server/Internal Error (Status 13)
            const serverError = validationResults.find(result => result.statusId === 13);
            if (serverError) {
                return res.status(503).json({
                    success: false,
                    message: "Judge server is busy. Reference solution check failed. Retry later.",
                    type: "SERVER_BUSY"
                });
            }

            // 2. Check for Logical Errors in Reference Solution (WA, TLE, RE, CE)
            const failedCase = validationResults.find(result => result.statusId !== 3);
            if (failedCase) {
                return res.status(422).json({
                    success: false,
                    message: `Reference solution is incorrect for ${lang}. Fix your code before saving.`,
                    errorDetails: {
                        status: failedCase.status,
                        testCase: failedCase.testCase,
                        expected: failedCase.expected,
                        actual: failedCase.actual,
                        compileError: failedCase.error
                    }
                });
            }
        }

        const newProblem = await Problem.findByIdAndUpdate(id , {...req.body} , {runValidators : true , new : true});
        res.status(200).send(newProblem + "Updated Successfully");
    }
    catch(err)
    {
        console.error("Critical Error:", err);

        // 2. Mongoose Validation Error (Schema fields mismatch)
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: "Invalid Data",
                errors: messages
            });
        }

        // 3. Cast Error (Invalid ObjectId)
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: "Invalid ID format provided."
            });
        }

        // 4. Default 500 Error
        return res.status(500).json({
            success: false,
            message: "Internal Server Error.",
            error: err.message
        });
    }
}

const deleteProblem = async(req , res)=>{

    const {id} = req.params;
    try
    {
        if(!id)
            return res.status(400).send("Id is missing");

        const deletedProblem = await Problem.findByIdAndDelete(id);

        if(!deletedProblem)
            return res.status(404).send("Problem does not exist");

        res.status(200).send("Succefully Deleted");
    }
    catch(err)
    {
        res.status(500).send("Error : " + err);
    }
}

const fetchProblemById = async(req , res)=>{

    const {id} = req.params;
    try
    {
        if(!id)
            return res.status(400).send("Id is missing");

        const getProblem = await Problem.findById(id).select('title description difficulty tags visibleTestCases startCode');

        if(!getProblem)
            return res.status(404).send("Problem does not exist");

        res.status(200).send(getProblem);
    }
    catch(err)
    {
        res.status(500).send("Error : " + err);
    }
}

const fetchAllProblem = async (req, res) => {
    try {
        // 1. Get Query Params (Defaults: Page 1, 8 items per page)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const search = req.query.search || "";
        const difficulty = req.query.difficulty || "all";
        const category = req.query.category || "all";

        // 2. Build Search Filter
        const query = { visibility: 'public' };     
        
        // Search by Title (Case Insensitive Regex)
        if (search) {
            query.title = { $regex: search, $options: "i" };
        }

        // Filter by Difficulty
        if (difficulty !== "all") {
            query.difficulty = difficulty;
        }

        // Filter by Tag
        if (category !== "all") {
            query.tags = { $regex: category, $options: "i" };
        }

        // 3. Count Total Documents (For frontend pagination numbers)
        const total = await Problem.countDocuments(query);

        // 4. Fetch Specific Page
        const problems = await Problem.find(query)
            .select('title difficulty tags') // Lightweight fields only
            .skip((page - 1) * limit)        // Skip previous pages
            .limit(limit);                   // Limit results

        // 5. Return Data + Meta Info
        res.status(200).json({
            problems,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        res.status(500).send("Error : " + err);
    }
}


const fetchSolvedProblem = async(req ,res)=>{

    try
    {
        // const count = req.result.problemSolved.length;

        const userId =  req.result._id;
        // const user = await User.findById(userId).populate("problemSolved");

        const user = await User.findById(userId).populate({
            path : 'problemSolved',
            select:"_id title difficulty tags"
        });

        res.status(200).send(user.problemSolved);
    }
    catch(err)
    {
        res.status(500).send("Error Occured : " + err);
    }
}

const fetchSubmittedSolutions = async(req,res)=>{

    try
    {
        const userId = req.result._id;
        const problemId = req.query.pid; 

        const Solutions = await Submission.find({userId,problemId});

        if(Solutions.length == 0)
            res.status(200).send("No Sumissions");
        res.status(200).send(Solutions);
    }
    catch(err)
    {
        res.status(500).send("Error : " + err);
    }
}

// ... existing imports

// ADMIN/CREATOR ONLY: Fetch absolutely everything for management
const fetchRawProblems = async (req, res) => {
    try {
        // Simple fetch all, sorted by newest
        const problems = await Problem.find({})
            .select('title difficulty status visibility')
            .sort({ createdAt: -1 });
            
        res.status(200).json(problems);
    } catch (err) {
        res.status(500).send("Error fetching raw data");
    }
}

// Add to exports
module.exports = { 
    createProblem, 
    updateProblem, 
    deleteProblem, 
    fetchProblemById, 
    fetchAllProblem, 
    fetchSolvedProblem, 
    fetchSubmittedSolutions,
    fetchRawProblems // <--- Export this
};