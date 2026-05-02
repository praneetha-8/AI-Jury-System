import { JudgeId } from '../types';

export async function generateAIResponses(prompt: string): Promise<string[]> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to generate responses');
  }
  
  return res.json();
}

export async function judgeResponse(prompt: string, responseText: string, judgeId: JudgeId): Promise<{ score: number, justification: string }> {
  const res = await fetch('/api/judge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, responseText, judgeId })
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to evaluate response');
  }
  
  return res.json();
}
