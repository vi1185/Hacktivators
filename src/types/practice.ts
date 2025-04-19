export interface PracticeSession {
  currentTopic: any;
  id: string;
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  status: 'active' | 'completed';
  startTime: number;
  endTime?: number;
  interactions: PracticeInteraction[];
}

export interface QuestionContent {
  scenario: string;
  question: string;
  options: Array<{
    text: string;
    correct: boolean;
  }>;
  feedback: {
    correct: string;
    incorrect: string;
  };
  hints: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  timeEstimate: number;
  relatedConcepts: string[];
  visualAid?: {
    type: 'image' | 'diagram' | 'code' | 'math';
    content: string;
  };
  nextTopics?: string[];
}

export interface PracticeInteraction {
  id?: string;
  type: 'question' | 'exercise' | 'code' | 'visual';
  content: string | QuestionContent;
  timestamp: number;
  success?: boolean;
  attempts?: number;
  confidence?: number;
  needsHelp?: boolean;
  duration?: number;
}

export interface PracticeReport {
  sessionId: string;
  duration: number;
  totalInteractions: number;
  successRate: number;
  averageConfidence: number;
  helpRequests: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextSteps: string[];
  conceptMastery: Array<{
    concept: string;
    mastery: number;
    confidence: number;
  }>;
  adaptiveRecommendations: {
    expand: string[];
    simplify: string[];
    practice: string[];
  };
}

export interface CodeExercise {
  prompt: string;
  initialCode: string;
  testCases: Array<{
    input: string;
    expectedOutput: string;
  }>;
  hints: string[];
  solution: string;
  explanation: string;
}

export interface VisualExercise {
  type: 'diagram' | 'flowchart' | 'mindmap';
  prompt: string;
  elements: any[];
  correctLayout: any;
  hints: string[];
}

export interface PracticeMetrics {
  totalTime: number;
  successRate: number;
  averageAttempts: number;
  confidenceLevel: number;
  helpRequests: number;
  conceptMastery: Record<string, number>;
  strugglingAreas: string[];
  strengths: string[];
}

export interface CodePlaygroundExercise {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  initialCode: string;
  solution: string;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    description: string;
  }>;
  hints: string[];
  timeLimit?: number; // in seconds
  memoryLimit?: number; // in MB
  tags: string[];
  aiHints: {
    type: 'concept' | 'approach' | 'implementation' | 'optimization';
    content: string;
    trigger: 'manual' | 'error' | 'timeout' | 'memory';
  }[];
  executionEnvironment: {
    runtime: string;
    version: string;
    dependencies?: Record<string, string>;
  };
  validationScript?: string;
  scoring?: {
    correctness: number;
    performance: number;
    codeQuality: number;
    rubric: Array<{
      criterion: string;
      points: number;
      description: string;
    }>;
  };
}

export interface CodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
  memoryUsed?: number;
  testResults?: Array<{
    testCase: number;
    passed: boolean;
    output: string;
    expectedOutput: string;
    executionTime: number;
  }>;
  score?: {
    total: number;
    breakdown: {
      correctness: number;
      performance: number;
      codeQuality: number;
    };
    feedback: string[];
  };
} 