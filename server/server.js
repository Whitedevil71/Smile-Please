// This file runs on a secure server, protecting your API key.
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Loads the API key from the .env file
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000; // Use port from environment or default to 3000

// Middleware
app.use(cors()); // Allows the frontend to communicate with this server
app.use(express.json()); // Allows server to read JSON from requests

// Initialize the Gemini AI model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * NEW: A function to call the Gemini API with an automatic retry mechanism.
 * If the model is overloaded, it waits and tries again.
 * @param {string} prompt - The prompt to send to the AI.
 * @param {number} retries - The number of times to retry.
 * @param {number} delay - The initial delay in milliseconds.
 * @returns {Promise<string>} - The generated text from the AI.
 */
async function generateWithRetry(prompt, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text(); // Success! Return the text.
        } catch (error) {
            // Check if the error indicates the service is unavailable (overloaded)
            if (error.message && (error.message.includes('503') || error.message.toLowerCase().includes('overloaded'))) {
                console.log(`Attempt ${i + 1} failed: Model overloaded. Retrying in ${delay / 1000}s...`);
                // Don't wait after the final attempt
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Double the delay for the next retry (exponential backoff)
                }
            } else {
                // If it's a different kind of error, don't retry. Throw it immediately.
                throw error;
            }
        }
    }
    // If all retries have failed, throw a final, clear error.
    throw new Error('The model is currently overloaded. Please try again later.');
}

// Create an API endpoint
app.post('/api/gemini', async (req, res) => {
    try {
        const { prompt } = req.body; // Get the prompt from the client's request

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }

        // Call our new, robust function instead of the direct model call
        const text = await generateWithRetry(prompt);
        
        res.json({ text }); // Send the AI's response back to the client

    } catch (error) {
        console.error("Error in /api/gemini after retries:", error);
        // Send a more specific error message back to the client
        res.status(500).json({ error: error.message || 'Failed to get response from AI after several attempts.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
