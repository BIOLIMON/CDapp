import { MANUAL_CONTEXT } from "../constants";

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Sends a message to the Ollama Cloud API via our Cloudflare Pages Function proxy.
 * The proxy at /api/chat handles authentication and avoids CORS issues.
 */
export const sendMessageToOllama = async (userMessage: string, history: ChatMessage[] = []) => {
    try {
        const messages: ChatMessage[] = [
            { role: 'system', content: MANUAL_CONTEXT },
            ...history,
            { role: 'user', content: userMessage }
        ];

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages,
                stream: false
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server returned ${response.status}`);
        }

        const data = await response.json();
        return data.message?.content || "No se recibió respuesta del modelo.";

    } catch (error) {
        console.error("Error calling Ollama Cloud:", error);
        return "Lo siento, hubo un error al conectar con el asistente. Intenta de nuevo más tarde.";
    }
};
