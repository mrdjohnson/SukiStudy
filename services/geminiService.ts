import { GoogleGenAI } from "@google/genai";
import { Subject, SubjectType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateExplanation = async (subject: Subject, type: SubjectType): Promise<string> => {
  const model = "gemini-2.5-flash";
  
  const character = subject.characters || (subject.character_images && "Image Radical") || "Unknown";
  const primaryMeaning = subject.meanings.find(m => m.primary)?.meaning || "Unknown";
  const primaryReading = subject.readings?.find(r => r.primary)?.reading || "";

  const prompt = `
    You are an expert Japanese tutor helping a student learn WaniKani.
    
    Explain the ${type}: "${character}" (Meaning: ${primaryMeaning}${primaryReading ? `, Reading: ${primaryReading}` : ''}).
    
    1. Provide a brief etymology or origin story if relevant.
    2. Create a memorable, vivid mnemonic distinct from WaniKani's default one if possible (make it funny or weird).
    3. Give 2-3 common compound words where this kanji appears (if it is a kanji), with readings and meanings.
    
    Keep the tone encouraging and concise. Output in Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful Japanese language tutor."
      }
    });

    return response.text || "Sorry, I couldn't generate an explanation at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI tutor.";
  }
};
