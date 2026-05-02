export type JudgeId = 'logic' | 'ethics' | 'risk';

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
    name: 'Logical Analysis',
    description: 'Evaluates reasoning quality, coherence, and factual consistency.',
    icon: 'Scale',
    color: 'blue'
  },
  {
    id: 'ethics',
    name: 'Ethical Perspective',
    description: 'Evaluates moral implications, safety, and human-centric values.',
    icon: 'Gavel',
    color: 'amber'
  },
  {
    id: 'risk',
    name: 'Risk Sentinel',
    description: 'Identifies potential hazards, hallucinations, and safety drifts.',
    icon: 'ShieldAlert',
    color: 'rose'
  }
];
