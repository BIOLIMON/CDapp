import { GoogleGenAI } from "@google/genai";
import { MANUAL_CONTEXT } from "../constants";

// Ideally, this should be proxied through a backend to hide the key, 
// but for this client-side demo per instructions we assume it's available.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'YOUR_API_KEY_HERE';

const ai = new GoogleGenAI({ apiKey });

export const sendMessageToGemini = async (message: string) => {
  try {
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      return "⚠️ Error: API Key no configurada. Por favor configura VITE_GEMINI_API_KEY en .env.local para usar el asistente.";
    }

    const model = 'gemini-2.5-flash';
    const systemInstruction = MANUAL_CONTEXT;

    // Using generateContent with system instructions in config
    const response = await ai.models.generateContent({
      model: model,
      contents: message,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Lo siento, hubo un error al conectar con el asistente. Por favor intenta más tarde.";
  }
};
