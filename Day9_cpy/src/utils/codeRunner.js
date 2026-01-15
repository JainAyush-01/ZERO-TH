const { performance } = require('perf_hooks');

async function bulkJudge(userCode, driverCode, language, testCases, options = { stopOnError: true }) {
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

    // --- RETRY HELPER ---
    const fetchWithRetry = async (url, options, retries = 3) => {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                throw new Error("RATE_LIMIT");
            }
            if (!response.ok) {
                throw new Error("SERVER_ERROR");
            }
            return response;
        } catch (err) {
            if (retries > 0) {
                // Wait 1 second before retrying
                await new Promise(res => setTimeout(res, 1000));
                return fetchWithRetry(url, options, retries - 1);
            }
            throw err;
        }
    };

    // --- EXECUTION HELPER ---
    const executeSingleCase = async (tc, index) => {
        const startTime = performance.now();
        try {
            const response = await fetchWithRetry("https://emkc.org/api/v2/piston/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: language,
                    version: langConfig[language].version,
                    files: [{ name: langConfig[language].fileName, content: fullCode }],
                    stdin: tc.input
                }),
                signal: AbortSignal.timeout(10000) 
            });

            const data = await response.json();
            const endTime = performance.now();
            const run = data.run;
            
            let statusId = 3; 
            let statusDesc = "Accepted";
            let errorMsg = "";

            if (data.compile && data.compile.stderr) {
                statusId = 6; statusDesc = "Compilation Error";
                errorMsg = data.compile.stderr;
            } else if (run.stderr) {
                statusId = 11; statusDesc = "Runtime Error";
                errorMsg = run.stderr;
            } else if (run.signal === "SIGKILL") {
                statusId = 5; statusDesc = "Time Limit Exceeded";
            } else if (run.stdout.trim() !== tc.expected.trim()) {
                statusId = 4; statusDesc = "Wrong Answer";
            }

            return {
                testCase: index + 1,
                input: tc.input,
                statusId,
                status: statusDesc,
                actual: run.stdout ? run.stdout.trim() : "",
                expected: tc.expected.trim(),
                error: errorMsg,
                runtime: Math.floor(endTime - startTime),
                memory: "N/A"
            };
        } catch (error) {
            return {
                testCase: index + 1,
                input: tc.input,
                statusId: 13,
                status: "Internal Error",
                error: error.message === "RATE_LIMIT" ? "Judge Rate Limit" : "Judge Server Busy",
                runtime: 0,
                memory: "N/A"
            };
        }
    };

    // --- SERIAL BATCHING (Safest for Public API) ---
    // We run 1 at a time to prevent 429 Errors. 
    // Since you have few test cases, this is fast enough.
    const results = [];
    
    for (let i = 0; i < testCases.length; i++) {
        const result = await executeSingleCase(testCases[i], i);
        results.push(result);
        
        // Stop early if needed
        if (options.stopOnError && result.statusId !== 3) {
            break;
        }
    }
    
    return results;
}

module.exports = bulkJudge;