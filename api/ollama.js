
export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const ollamaUrl = process.env.VITE_OLLAMA_API_URL;

        if (!ollamaUrl) {
            return res.status(500).json({ error: 'Minimun Configuration Error: VITE_OLLAMA_API_URL is not set.' });
        }

        // Remove trailing slash and append the chat endpoint
        const targetUrl = ollamaUrl.replace(/\/$/, '') + '/api/chat';

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true', // Critical for ngrok
            },
            body: JSON.stringify(req.body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Ollama Remote Error', details: errorText });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
