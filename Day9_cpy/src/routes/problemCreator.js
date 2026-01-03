const express = require('express');
const validateAdmin = require('../middleware/validateAdmin');
const validateUser = require('../middleware/validateUser');
const validateCreator = require('../middleware/validateCreator');
const {createProblem , updateProblem , deleteProblem ,fetchProblemById,fetchAllProblem,fetchSolvedProblem,fetchSubmittedSolutions,fetchRawProblems} = require('../controllers/problemManager')
const problemRouter = express.Router();


//Create the problem
problemRouter.post('/create',validateAdmin,createProblem);
//fetch
problemRouter.get('/fetchProblemById/:id',validateUser,fetchProblemById);
// //fetchAll
problemRouter.get('/fetchAllProblem',validateUser,fetchAllProblem);
// //fetch Solved Problem By User
problemRouter.get('/fetchSolvedProblems',validateUser,fetchSolvedProblem);

problemRouter.get('/fetchSubmittedProblem',validateUser,fetchSubmittedSolutions);
// //Update 
problemRouter.put('/update/:id' ,validateAdmin, updateProblem);
// //Delete
problemRouter.delete('/delete/:id' ,validateAdmin,deleteProblem);

problemRouter.post('/create', validateCreator, createProblem);
problemRouter.put('/update/:id', validateCreator, updateProblem);
problemRouter.get('/admin/all', validateCreator, fetchRawProblems);

module.exports = problemRouter;