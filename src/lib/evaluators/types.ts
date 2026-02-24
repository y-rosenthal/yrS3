export interface EvaluationResult {
  score: number;
  maxScore: number;
  passed: boolean;
  feedback: string;
  details?: Record<string, unknown>;
}
