import { JudgeId } from '../types';

// ✅ Generate AI responses
export async function generateAIResponses(prompt: string): Promise<string[]> {
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate responses');
    }

    const data = await res.json();

    // ✅ Ensure always array (prevents UI crash)
    if (!Array.isArray(data)) {
      return [String(data)];
    }

    return data;

  } catch (error: any) {
    console.error("generateAIResponses error:", error);
    throw new Error(error.message || "Something went wrong while generating responses");
  }
}


// ✅ Judge evaluation
export async function judgeResponse(
  prompt: string,
  responseText: string,
  judgeId: JudgeId
): Promise<{ score: number; justification: string }> {

  try {
    const res = await fetch('/api/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        responseText, // ✅ must match backend
        judgeId
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to evaluate response');
    }

    const data = await res.json();

    // ✅ Safety fallback (prevents crash if API returns weird data)
    return {
      score: typeof data.score === "number" ? data.score : 0,
      justification: data.justification || "No justification provided"
    };

  } catch (error: any) {
    console.error("judgeResponse error:", error);

    // ✅ fallback instead of breaking UI
    return {
      score: 0,
      justification: "Evaluation failed"
    };
  }
}
