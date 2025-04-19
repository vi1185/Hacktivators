import { CodePlaygroundExercise } from "./practice";

export interface Course {
  id: string;
  title: string;
  description: string;
  prerequisites: string[];
  learningGoals: string[];
  modules: Module[];
  assessment: string[];
  difficulty: string;
  duration: string;
  totalDays: number;
  createdAt: string;
  updatedAt: string;
  user_id: string;
  progress?: number;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  order: number;
  duration: number;
  lessons: Lesson[];
  completed: boolean;
  progress: number;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  order: number;
  duration: number;
  exercises: Exercise[];
  resources: Resource[];
  sessions: Session[];
  completed: boolean;
  progress: number;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  type: string;
  completed: boolean;
}

export interface Resource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'document';
  url: string;
  duration?: string;
  difficulty?: string;
}

export interface Session {
  id: string;
  day: number;
  title: string;
  duration: string;
  objectives: string[];
  activities: string[];
  materials: string[];
  homework?: string;
  notes?: string;
  completed: boolean;
  sections?: SessionSection[];
}

export interface SessionSection {
  id: string;
  title: string;
  content: string;
  type: 'reading' | 'exercise' | 'quiz' | 'group-activity' | 'discussion' | 'code_playground';
  duration: number;
  interactiveElements?: {
    type: 'quiz' | 'code' | 'diagram' | 'flashcards' | 'code_playground';
    data: {
      code?: {
        language: string;
        code: string;
        tests?: string[];
      };
      diagram?: {
        type: string;
        data: any;
      };
      quiz?: {
        questions: QuizQuestion[];
      };
      flashcards?: {
        cards: Flashcard[];
      };
    };
  }[];
  resources?: Resource[];
  questions: {
    question: string;
    answer: string;
    type: "discussion" | "reflection" | "quiz" | "exercise";
    hints?: string[];
    rubric?: {
      criteria: string;
      points: number;
      description: string;
    }[];
  }[];
  codeExercises?: CodePlaygroundExercise[];
  groupActivities?: {
    title: string;
    description: string;
    roles: string[];
    duration: string;
    objectives: string[];
    deliverables: string[];
  }[];
  assessments?: {
    type: "quiz" | "project" | "peer_review" | "self_assessment" | "code_challenge";
    questions: Array<{
      type: "multiple_choice" | "open_ended" | "true_false" | "coding";
      question: string;
      options?: string[];
      correctAnswer?: string | number;
      points: number;
      feedback: {
        correct: string;
        incorrect: string;
      };
    }>;
  }[];
  feedback?: {
    automated: boolean;
    rubric?: {
      criteria: string;
      levels: Array<{
        score: number;
        description: string;
      }>;
    }[];
  };
  prerequisites?: string[];
  nextSteps?: string[];
  adaptiveContent?: {
    difficulty: "beginner" | "intermediate" | "advanced";
    variations: Array<{
      condition: string;
      content: string;
    }>;
  };
}

export interface MCQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: "learning_style" | "time_availability" | "prior_experience" | "goals" | "preferences" | "challenges";
  weight: number;
  userAnswer?: number;
}

export interface UserAssessment {
  learningStyle: {
    visual: number;
    auditory: number;
    reading: number;
    kinesthetic: number;
  };
  timeCommitment: {
    hoursPerWeek: number;
    preferredTimeOfDay: string;
  };
  priorKnowledge: {
    level: "beginner" | "intermediate" | "advanced";
    topics: string[];
  };
  preferences: {
    practicalProjects: boolean;
    groupWork: boolean;
    readingMaterials: boolean;
    videoContent: boolean;
    interactiveExercises: boolean;
  };
  challenges: string[];
  recommendedPace: "relaxed" | "standard" | "intensive";
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}
