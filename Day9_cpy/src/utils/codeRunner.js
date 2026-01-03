const { performance } = require('perf_hooks');

async function bulkJudge(userCode, driverCode, language, testCases) {
    const langConfig = {
        cpp: { version: "10.2.0", fileName: "main.cpp" },
        java: { version: "15.0.2", fileName: "Main.java" },
        python: { version: "3.10.0", fileName: "main.py" },
        javascript: { version: "18.15.0", fileName: "main.js" }
    };

    const getDefaultHeaders = (lang) => {
        const headers = {
            cpp: "#include <bits/stdc++.h>\nusing namespace std;",
            java: "import java.util.*;\nimport java.io.*;",
            python: "import sys\nimport math\nimport collections",
            javascript: "const fs = require('fs');"
        };
        return headers[lang] || "";
    };

    let fullCode = "";
    if (language === 'java') {
        fullCode = `${getDefaultHeaders(language)}\n\n${driverCode}\n\n${userCode}`;
    } else {
        fullCode = `${getDefaultHeaders(language)}\n\n${userCode}\n\n${driverCode}`;
    }

    // 1. Map every test case to a Promise (API Call)
    // This starts ALL requests immediately without waiting for the previous one.
    const promises = testCases.map(async (tc, index) => {
        const startTime = performance.now();
        
        try {
            const response = await fetch("https://emkc.org/api/v2/piston/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: language,
                    version: langConfig[language].version,
                    files: [{ name: langConfig[language].fileName, content: fullCode }],
                    stdin: tc.input // Send specific input for this case
                }),
                // 8 second timeout per request
                signal: AbortSignal.timeout(8000) 
            });

            if (!response.ok) {
                // Handle Rate Limiting (429) specifically
                if (response.status === 429) throw new Error("RATE_LIMIT");
                throw new Error("SERVER_BUSY");
            }

            const data = await response.json();
            const endTime = performance.now();
            const run = data.run;
            
            // Calculate Status
            let statusId = 3; 
            let statusDesc = "Accepted";
            let errorMsg = "";

            // Check Compilation Error
            if (data.compile && data.compile.stderr) {
                statusId = 6; statusDesc = "Compilation Error";
                errorMsg = data.compile.stderr;
            } 
            // Check Runtime Error
            else if (run.stderr) {
                statusId = 11; statusDesc = "Runtime Error";
                errorMsg = run.stderr;
            } 
            // Check Timeout (SIGKILL)
            else if (run.signal === "SIGKILL") {
                statusId = 5; statusDesc = "Time Limit Exceeded";
            } 
            // Check Wrong Answer
            else if (run.stdout.trim() !== tc.expected.trim()) {
                statusId = 4; statusDesc = "Wrong Answer";
            }

            // Return Result Object
            return {
                testCase: index + 1,
                input: tc.input, // Pass input back for UI
                statusId,
                status: statusDesc,
                actual: run.stdout ? run.stdout.trim() : "",
                expected: tc.expected.trim(),
                error: errorMsg,
                runtime: Math.floor(endTime - startTime),
                memory: "N/A"
            };

        } catch (error) {
            // Handle Errors (Rate Limit or Network Fail)
            return {
                testCase: index + 1,
                input: tc.input,
                statusId: error.message === "RATE_LIMIT" ? 13 : 13,
                status: "Internal Error",
                error: error.message === "RATE_LIMIT" ? "Judge Rate Limit (Too many requests)" : "Judge Server Busy",
                runtime: 0,
                memory: "N/A"
            };
        }
    });

    // 2. Wait for ALL promises to resolve
    // This finishes when the SLOWEST test case finishes.
    const results = await Promise.all(promises);
    
    return results;
}

module.exports = bulkJudge;