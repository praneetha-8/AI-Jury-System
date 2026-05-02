export type JudgeId = 'logic' | 'clarity' | 'strict' | 'helpful';

export interface Evaluation {
  id?: string;
  judgeId: JudgeId;
  score: number;
  justification: string;
}

export interface ResponseData {
  id: string;
  text: string;
  modelId: string;
  evaluations: Evaluation[];
  userScore?: number;
  finalScore?: number;
}

export interface Session {
  id: string;
  prompt: string;
  createdAt: any; // Firestore Timestamp
  status: 'pending' | 'generating' | 'evaluating' | 'completed';
}

export interface JudgePersona {
  id: JudgeId;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const JUDGES: JudgePersona[] = [
  {
    id: 'logic',
    name: 'Logic Judge',
    description: 'Evaluates reasoning quality, coherence, and factual consistency.',
    icon: 'Scale',
    color: 'blue'
  },
  {
    id: 'clarity',
    name: 'Clarity Judge',
    description: 'Evaluates explanation clarity, readability, and structure.',
    icon: 'Search',
    color: 'emerald'
  },
  {
    id: 'strict',
    name: 'Strict Judge',
    description: 'Gives harsh scoring, focusing on flaws and missed opportunities.',
    icon: 'ShieldAlert',
    color: 'rose'
  },
  {
    id: 'helpful',
    name: 'Helpful Judge',
    description: 'Evaluates usefulness, empathy, and practical applicability.',
    icon: 'HeartHandshake',
    color: 'amber'
  }
];
