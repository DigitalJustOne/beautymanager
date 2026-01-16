/// <reference types="vite/client" />
import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    if (!apiKey) {
      console.error("❌ API Key de Gemini no encontrada. Reinicia el servidor para cargar los cambios en .env.local.");
      throw new Error("API Key no configurada");
    }

    const systemPrompt = "Eres un asistente virtual útil y profesional para una aplicación de gestión de salón de belleza llamada 'BeautyManager Pro'. Ayudas al estilista a gestionar citas, consultas de clientes y consejos de negocio. Mantén las respuestas concisas, amables y en español.\n\n";

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: systemPrompt + message,
    });

    // @ts-ignore - Check if text is function or property
    const text = typeof response.text === 'function' ? response.text() : response.text;

    return text || "Lo siento, no pude generar una respuesta en este momento.";
  } catch (error: any) {
    console.error("❌ Error comunicándose con Gemini:", error);
    // Devolvemos el error técnico para diagnosticar
    return `Error técnico: ${error.message || error.toString()}`;
  }
};