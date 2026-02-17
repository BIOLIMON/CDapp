import { MANUAL_CONTEXT } from "../constants";

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Sends a message to the Ollama Cloud API (ollama.com).
 * Requires VITE_OLLAMA_API_KEY env variable to be set.
 */
export const sendMessageToOllama = async (userMessage: string, history: ChatMessage[] = []) => {
    const apiKey = import.meta.env.VITE_OLLAMA_API_KEY;
    const model = import.meta.env.VITE_OLLAMA_MODEL || 'gemma3:12b';
    const baseUrl = 'https://ollama.com/api/chat';

    if (!apiKey) {
        return "⚠️ El asistente no está configurado. Falta la clave de API (VITE_OLLAMA_API_KEY).";
    }

    try {
        const messages: ChatMessage[] = [
            { role: 'system', content: MANUAL_CONTEXT },
            ...history,
            { role: 'user', content: userMessage }
        ];

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                stream: false
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Ollama Cloud returned ${response.status}: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        return data.message?.content || "No se recibió respuesta del modelo.";

    } catch (error) {
        console.error("Error calling Ollama Cloud:", error);
        return "Lo siento, hubo un error al conectar con el asistente. Verifica que la clave de API sea válida.";
    }
};
