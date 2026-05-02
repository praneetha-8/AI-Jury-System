import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;
    const ai = getAI();

    const systemInstruction = `You are a testing platform. Given a prompt, generate FIVE distinct AI responses:
    1. Agent-A: Professional and balanced.
    2. Agent-B: Creative and narrative-driven.
    3. Agent-C: Technical, direct, and data-focused.
    4. Agent-D: Socratic, questioning and analytical.
    5. Agent-E: Friendly, empathetic, and casual.
    Return them as a JSON array of 5 strings.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${systemInstruction}\n\nPrompt: ${prompt}`,
      config: { responseMimeType: "application/json" }
    });

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("API Error (Generate):", error);
    res.status(500).json({ error: error.message || "Failed to generate responses" });
  }
}
