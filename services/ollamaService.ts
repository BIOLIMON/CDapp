import { MANUAL_CONTEXT } from "../constants";

const getApiUrl = () => {
    const url = import.meta.env.VITE_OLLAMA_API_URL;
    if (!url || url === 'https://tu-url-ngrok.ngrok-free.app') {
        return null;
    }
    // Remove trailing slash if present
    return url.replace(/\/$/, '');
};

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const sendMessageToOllama = async (userMessage: string, history: ChatMessage[] = []) => {
    const baseUrl = getApiUrl();

    if (!baseUrl) {
        return "⚠️ Error: URL de Ollama no configurada. Configura VITE_OLLAMA_API_URL en .env.local con tu URL de Ngrok.";
    }

    try {
        // Construct messages array with system prompt first
        const messages: ChatMessage[] = [
            { role: 'system', content: MANUAL_CONTEXT },
            ...history,
            { role: 'user', content: userMessage }
        ];

        const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
            },
            body: JSON.stringify({
                model: 'mistral:7b',
                messages: messages,
                stream: false
            }),
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.message?.content || "No se recibió respuesta del modelo.";

    } catch (error) {
        console.error("Error calling Ollama:", error);
        return "Lo siento, hubo un error al conectar con el asistente remoto. Verifica que el servidor (Ngrok) esté activo.";
    }
};
