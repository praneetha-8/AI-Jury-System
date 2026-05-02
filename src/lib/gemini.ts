import { GoogleGenAI, Type } from "@google/genai";
import { JudgeId } from "../types";

const ai = new GoogleGenAI({ apiKey: (process as any).env.GEMINI_API_KEY });

const MAX_RETRIES = 3;

async function generateWithRetry(params: any, retries = 0): Promise<any> {
  try {
    return await ai.models.generateContent(params);
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.warn(`Gemini API error, retrying... (${retries + 1}/${MAX_RETRIES})`, error);
      return generateWithRetry(params, retries + 1);
    }
    throw error;
  }
}

export const generateAIResponses = async (prompt: string): Promise<string[]> => {
  const systemInstruction = `You are a testing platform. Given a prompt, generate FIVE distinct AI responses:
  1. Agent-A: Professional and balanced.
  2. Agent-B: Creative and narrative-driven.
  3. Agent-C: Technical, direct, and data-focused.
  4. Agent-D: Socratic, questioning and analytical.
  5. Agent-E: Friendly, empathetic, and casual.
  Return them as a JSON array of 5 strings.`;

  const result = await generateWithRetry({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    const text = result.text || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return ["Error generating response A", "Error generating response B"];
  }
};

export const judgeResponse = async (
  prompt: string,
  responseText: string,
  judgeId: JudgeId
): Promise<{ score: number; justification: string }> => {
  const judgePrompts: Record<JudgeId, string> = {
    logic: "Focus on logical consistency, reasoning depth, and factual accuracy. Be objective and analytical.",
    clarity: "Focus on how easy the response is to understand, its structure, and use of language. Is it concise?",
    strict: "Be extremely critical. Look for any minor errors, hallucinations, or lack of depth. Score harshly.",
    helpful: "Focus on the user experience. Is the response polite? Does it actually solve the user's problem?"
  };

  const systemInstruction = `You are the ${judgeId.toUpperCase()} JUDGE in an AI jury panel.
  Evaluate the following AI response accurately based on your persona: ${judgePrompts[judgeId]}.
  Return a JSON object with:
  - score: (integer 1-10)
  - justification: (short string, max 2 sentences)`;

  const userContent = `Prompt: ${prompt}\n\nResponse to Evaluate: ${responseText}`;

  const result = await generateWithRetry({
    model: "gemini-3-flash-preview",
    contents: userContent,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          justification: { type: Type.STRING }
        },
        required: ["score", "justification"]
      }
    }
  });

  try {
    const text = result.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    return { score: 5, justification: "Evaluation failed due to technical error." };
  }
};
