// Cloudflare Pages Function - proxies chat requests to Ollama Cloud API
// This runs server-side, avoiding CORS issues with direct browser calls

export async function onRequestPost(context) {
    const { request, env } = context;

    const OLLAMA_API_KEY = env.OLLAMA_API_KEY;
    const OLLAMA_MODEL = env.OLLAMA_MODEL || 'gemma3:12b';

    if (!OLLAMA_API_KEY) {
        return new Response(
            JSON.stringify({ error: 'OLLAMA_API_KEY not configured on server' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const body = await request.json();

        // Ensure model is set
        if (!body.model) {
            body.model = OLLAMA_MODEL;
        }

        const ollamaResponse = await fetch('https://ollama.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OLLAMA_API_KEY}`,
            },
            body: JSON.stringify(body),
        });

        if (!ollamaResponse.ok) {
            const errorText = await ollamaResponse.text();
            return new Response(
                JSON.stringify({ error: 'Ollama API error', details: errorText }),
                {
                    status: ollamaResponse.status,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const data = await ollamaResponse.json();
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Proxy error', details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
