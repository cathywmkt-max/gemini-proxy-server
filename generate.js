// This file acts as a proxy to securely call the Gemini API from the client.
// It uses an environment variable to store the API key, keeping it safe.

import { URLSearchParams } from 'url';

// A helper function to handle the fetch with exponential backoff for retries
const fetchWithBackoff = async (url, options, retries = 3, delay = 1000) => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`Fetch failed, retrying in ${delay}ms...`, error.message);
            await new Promise(res => setTimeout(res, delay));
            return fetchWithBackoff(url, options, retries - 1, delay * 2);
        } else {
            throw error;
        }
    }
};

export default async function handler(req, res) {
    // Ensure the API key is set in Vercel's environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key is not configured.' });
    }

    // Define the Gemini API endpoint
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    if (req.method === 'POST') {
        try {
            const payload = req.body;
            
            const response = await fetchWithBackoff(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            res.status(200).json(data);

        } catch (error) {
            console.error('Error in proxy handler:', error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    } else {
        // Handle non-POST requests
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
