const Problem = require('../models/problem');
const runCode = require('../utils/codeRunner');
const User = require('../models/user');
const Submission = require('../models/submission');

// --- HELPER FUNCTION: Extracts the repeated execution logic! ---
const validateReferenceSolutions = async (referenceSolution, driverCode, allTestCases) => {
    
    for (const sol of referenceSolution) {
        const lang = sol.language;
        const driver = driverCode.find(d => d.language === lang);
        
        if (!driver) return { error: `Driver missing for language: ${lang}.` };

        const validationResults = await runCode(sol.CompleteCode, driver.Code, lang, allTestCases);

        const serverError = validationResults.find(result => result.statusId === 13);
        if (serverError) return { error: "Judge server is busy. Retry later.", isServerBusy: true };

        const failedCase = validationResults.find(result => result.statusId !== 3);
        if (failedCase) {
            return {
                error: `Reference solution is incorrect for ${lang}.`,
                details: {
                    status: failedCase.status, testCase: failedCase.testCase,
                    expected: failedCase.expected, actual: failedCase.actual, compileError: failedCase.error
                }
            };
        }
    }
    return { success: true };
};

const createProblem = async (req, res) => {
    const { title, description, difficulty, tags, visibleTestCases, hiddenTestCases, startCode, referenceSolution, driverCode, status, visibility } = req.body;

    try {
        if (!title || !description || !referenceSolution || !driverCode) {
            return res.status(400).json({ success: false, message: "Incomplete Data" });
        }

        const allTestCases = [...visibleTestCases, ...hiddenTestCases].map(tc => ({ input: tc.input, expected: tc.output }));

        // Use the helper function here!
        const validation = await validateReferenceSolutions(referenceSolution, driverCode, allTestCases);
        if (!validation.success) {
            return res.status(validation.isServerBusy ? 503 : 422).json({
                success: false, message: validation.error, errorDetails: validation.details
            });
        }

        await Problem.create({
            ...req.body, status: status || 'draft', visibility: visibility || 'public',
            author: req.result._id, problemCreator: req.result._id 
        });

        return res.status(201).send("Problem Created Successfully");
    } catch (err) {
        console.error("Critical Error:", err);
        if (err.code === 11000) return res.status(400).json({ success: false, message: "Title already exists" });
        if (err.name === 'ValidationError') return res.status(400).json({ success: false, message: "Invalid Data" });
        return res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};

const updateProblem = async(req, res) => {
    const { id } = req.params;
    const { title, description, visibleTestCases, hiddenTestCases, referenceSolution, driverCode } = req.body;

    try {
        if (!id) return res.status(400).send("Missing Id Field");

        const dsaProblem = await Problem.findById(id);
        if (!dsaProblem) return res.status(404).send("Id is invalid");

        if (!title || !description || !referenceSolution || !driverCode) {
            return res.status(400).json({ success: false, message: "Incomplete Data" });
        }

        const allTestCases = [...visibleTestCases, ...hiddenTestCases].map(tc => ({ input: tc.input, expected: tc.output }));

        // Use the exact same helper function here! No more copy-pasting!
        const validation = await validateReferenceSolutions(referenceSolution, driverCode, allTestCases);
        if (!validation.success) {
            return res.status(validation.isServerBusy ? 503 : 422).json({
                success: false, message: validation.error, errorDetails: validation.details
            });
        }

        await Problem.findByIdAndUpdate(id, { ...req.body }, { runValidators: true, new: true });

        res.status(200).send("Problem Updated Successfully"); 
    }
    catch(err) {
        console.error("Critical Error:", err);
        if (err.name === 'ValidationError') return res.status(400).json({ success: false, message: "Invalid Data" });
        return res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};


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
    try {
        const userId = req.result._id;
        const problemId = req.query.pid;

        if(!problemId) return res.status(400).send("Missing Problem ID");

        const solutions = await Submission.find({userId, problemId})
            .sort({ createdAt: -1 });

        // Standardize: Send as an object so the frontend knows what it is receiving
        res.status(200).json({ submissions: solutions });
    } catch(err) {
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