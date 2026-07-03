const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Initialize API Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const askAI = async (req, res) => {
    try {
        const { prompt, code, problemContext, errorContext } = req.body;

        // 1. Define the System Persona (The Brain)
        // This instructs the AI on HOW to behave before it sees the user's question.
        const systemInstruction = `
        You are ZEROTH AI, an elite algorithmic coding assistant embedded in a high-performance competitive programming platform.
        
        YOUR ROLE:
        - Act as a Senior Software Engineer conducting a technical interview.
        - Analyze the user's code for Time/Space complexity issues.
        - If the user asks for a solution, DO NOT give the code immediately. Provide a conceptual hint or pseudocode first.
        - If the user receives an error, explain exactly WHY the error happened in their specific code.
        - Keep responses concise, technical, and professional. Avoid "fluff" talk.
        `;

        // 2. Initialize Model (Using gemini-3.5-flash for speed/cost or gemini-3.1-pro for reasoning)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.5-flash",
            systemInstruction: systemInstruction
        });

        // 3. Construct the User's Context
        // We combine all the signals (Problem, Code, Error) into one rich prompt.
        const fullUserMessage = `
        CONTEXT_DATA:
        [Problem Title]: ${problemContext?.title || "Unknown"}
        [Difficulty]: ${problemContext?.difficulty || "Unknown"}
        [Problem Description]: ${problemContext?.description?.substring(0, 1000) || "N/A"}...
        [Current Code]:
        \`\`\`${problemContext?.language || "javascript"}
        ${code}
        \`\`\`
        [Runtime Error]: ${errorContext || "None"}

        USER_QUESTION: "${prompt}"
        `;

        // 4. Generate Response
        const result = await model.generateContent(fullUserMessage);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ reply: text });

    } catch (err) {
        console.error("AI Generation Error:", err);
        // Handle Safety/Blocked responses gracefully
        if (err.response && err.response.promptFeedback && err.response.promptFeedback.blockReason) {
            return res.status(400).json({ reply: "My safety protocols prevent me from answering this query." });
        }
        res.status(500).send("Neural Link Severed: " + err.message);
    }
};

module.exports = { askAI };