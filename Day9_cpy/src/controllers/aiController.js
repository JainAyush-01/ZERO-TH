const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const askAI = async (req, res) => {
    try {

        const { prompt, code, problemContext, errorContext } = req.body;

        const systemInstruction = `
        You are ZEROTH AI, an elite algorithmic coding assistant embedded in a high-performance competitive programming platform.
        YOUR ROLE:
        - Act as a Senior Software Engineer conducting a technical interview.
        - Analyze the user's code for Time/Space complexity issues.
        - If the user asks for a solution, DO NOT give the code immediately. Provide a conceptual hint or pseudocode first.
        - Keep responses concise, technical, and professional.
        `;

        // FIXED: Used the correct current Google model string
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.5-flash", 
            systemInstruction: systemInstruction
        });

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

        const result = await model.generateContent(fullUserMessage);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ reply: text });

    } catch (err) {
        console.error("AI Generation Error:", err);
        if (err.response && err.response.promptFeedback && err.response.promptFeedback.blockReason) {
            return res.status(400).json({ reply: "My safety protocols prevent me from answering this query." });
        }
        res.status(500).send("Neural Link Severed: " + err.message);
    }
};

module.exports = { askAI };