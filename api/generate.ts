import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-latest", // ✅ stable model
      contents: `Generate 5 different responses for:\n${prompt}`,
    });

    const text = response.text || "";

    // ✅ ALWAYS return array (frontend expects this)
    const responses = text
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .slice(0, 5);

    return res.status(200).json(responses);

  } catch (error: any) {
    console.error("Generate API Error:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate responses",
    });
  }
}
