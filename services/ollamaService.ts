import { MANUAL_CONTEXT } from "../constants";



export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const sendMessageToOllama = async (userMessage: string, history: ChatMessage[] = []) => {
    // We now use the local proxy to avoid CORS issues
    const baseUrl = '/api/ollama';

    try {
        // Construct messages array with system prompt first
        const messages: ChatMessage[] = [
            { role: 'system', content: MANUAL_CONTEXT },
            ...history,
            { role: 'user', content: userMessage }
        ];

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'mistral:7b', // This can be overriden by the proxy if needed, but sending it for clarity
                messages: messages,
                stream: false
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Server returned ${response.status}: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        return data.message?.content || "No se recibió respuesta del modelo.";

    } catch (error) {
        console.error("Error calling Ollama:", error);
        return "Lo siento, hubo un error al conectar con el asistente remoto. Verifica que el servidor (Ngrok) esté activo y la configuración sea correcta.";
    }
};
