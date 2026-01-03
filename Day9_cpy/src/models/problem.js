const mongoose = require('mongoose');
const User = require('./user');
const {Schema} = mongoose;

const problemSchema = new Schema({

    title : {
        type : String,
        required : true,
        unique : true
    },
    description : {
        type : String,
        required: true
    },
    difficulty : {
        type : String,
        enum : ['easy' , 'medium' , 'hard'],
        required:true
    },
    tags : {
        type : String,
        enum : ["Array", "String", "Hash Table", "Dynamic Programming", "Math","Sorting", "Greedy", "Depth-First Search", "Binary Search", "Database",
                "Breadth-First Search", "Tree", "Matrix", "Two Pointers", "Binary Tree","Bit Manipulation", "Heap (Priority Queue)", "Stack", "Prefix Sum", "Graph",
                "Simulation", "Design", "Counting", "Sliding Window", "Backtracking","Union Find", "Linked List", "Enumeration", "Monotonic Stack", "Trie",
                "Number Theory", "Recursion", "Segment Tree", "Binary Search Tree", "Bitmask","Queue", "Binary Indexed Tree", "Memoization", "Geometry", "Topological Sort",
                "Ordered Set", "String Matching", "Rolling Hash", "Shortest Path", "Combinatorics","Game Theory", "Data Stream", "Interactive", "Monotonic Queue", "Brainteaser",
                "Randomized", "Merge Sort", "Doubly-Linked List", "Quickselect", "Counting Sort","Minimum Spanning Tree", "Probability and Statistics", "Suffix Array", "Concurrency",
                "Shell", "Line Sweep", "Reservoir Sampling", "Strongly Connected Component","Eulerian Circuit", "Radix Sort", "Rejection Sampling", "Biconnected Component"
            ],
        
        required : true,
    },

    visibleTestCases : [
        {
            input : 
            {
                type : String,
                required : true
            },
            output :
            {
                type : String,
                required : true
            },
            explanation :
            {
                type : String,
                required : true
            }
        }
    ],

    hiddenTestCases : [
        {
            input : 
            {
                type : String,
                required : true
            },
            output :
            {
                type : String,
                required : true
            },
            explanation :
            {
                type : String,
                required : true
            }
        }
    ],

    startCode : [
        {
            language : {
                type : String,
                required : true
            },
            initialCode : {
                type : String,
                required : true
            }
        }
    ],

    referenceSolution :[
        {
            language : {
                type : String,
                required : true
            },
            CompleteCode : {
                type : String,
                required : true
            }
        }
    ],  
    driverCode: [
        {
            language : {
                type : String,
                required : true
            },
            Code : {
                type : String,
                required : true
            }
        }
    ],
    problemCreator :{
        type : Schema.Types.ObjectId,
        ref : 'user',
        required : true
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft' // Problems start hidden by default
    },
    visibility: {
        type: String,
        enum: ['public', 'contest', 'private'],
        default: 'public'
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    contestId: { // Will link to Contest Model later
        type: Schema.Types.ObjectId,
        ref: 'contest',
        default: null
    }
})

const Problem = mongoose.model('problem',problemSchema);
module.exports = Problem;