import axios, { AxiosError } from 'axios';
import type { Course, Exercise, Flashcard, Resource, UserAssessment } from '../types/course';
import type { PracticeSession, PracticeReport, CodePlaygroundExercise, CodeExecutionResult, PracticeInteraction } from '../types/practice';

const API_URL = import.meta.env.VITE_AUTOGEN_API_URL || 'http://localhost:8000';

// Update MCQuestion interface to include all necessary fields
export interface MCQuestion {
  id: string;
  question: string;
  type: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  content?: string;
  difficulty?: string;
  category?: string;
  weight?: number;
}

interface AutogenMetadata {
  timestamp: string;
  status: number;
  statusText: string;
  warning?: string;
}

interface AutogenError {
  message: string;
  code: string;
  metadata?: AutogenMetadata;
}

export interface AutogenResponse<T> {
  success: boolean;
  data: T | null;
  error?: AutogenError;
  metadata?: AutogenMetadata;
}

export interface VisualResponse {
  type: 'mermaid' | 'flowchart' | 'markdown' | 'react-flow';
  code: string;
  style?: Record<string, any>;
}

export interface ContentSummary {
  summary: string;
  keyPoints: string[];
  estimatedReadingTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface LearningObjective {
  id: string;
  description: string;
  category: 'knowledge' | 'comprehension' | 'application' | 'analysis' | 'synthesis' | 'evaluation';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface StudyPlan {
  title: string;
  description: string;
  currentLevel?: string;
  targetLevel?: string;
  estimatedHours?: number;
  modules?: StudyModule[];
  resources?: StudyResource[];
  milestones?: StudyMilestone[];
  sessions: Array<{
    title: string;
    description: string;
    activities?: Array<{
      type: string;
      content: string;
    }>;
  }>;
}

export interface StudyModule {
  title: string;
  description: string;
  estimatedHours: number;
  topics: string[];
  learningObjectives: string[];
}

export interface StudyResource {
  title: string;
  type: 'article' | 'video' | 'book' | 'course' | 'exercise' | 'other';
  url?: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface StudyMilestone {
  title: string;
  description: string;
  estimatedCompletionTime: number;
  checkpoints: string[];
}

export interface PracticeProblem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
  solution?: string;
  hints?: string[];
  expectedTime: number;
}

export interface CodeExplanation {
  explanation: string;
  concepts: string[];
  bestPractices: string[];
  commonMistakes: string[];
  suggestions: string[];
}

export interface PersonalizedPath {
  recommendedOrder: string[];
  focusAreas: string[];
  prerequisites: string[];
  estimatedTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  tags: string[];
}

export interface ChatContext {
  courseId: string;
  moduleId: string;
  lessonId: string;
  sessionId: string;
  userProgress: any;
  role: 'user' | 'assistant';
}

export interface ChatResponse {
  text: string;
  type?: 'text' | 'code' | 'markdown';
}

interface GenerateCustomContentParams {
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  context?: string;
  language?: string;
}

interface AnalyzeFileParams {
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  context?: string;
}

export interface SessionSection {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'code' | 'visual' | 'practice' | 'quiz';
  completed: boolean;
  order: number;
}

export interface Lesson {
  order: number;
  id: string;
  title: string;
  description: string;
  content: string;
  duration: number;
  completed: boolean;
  sessions: Session[];
  exercises?: Exercise[];
  resources?: Resource[];
  progress?: number;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  duration: number;
  completed: boolean;
  sections: SessionSection[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Helper function to calculate days from duration string
function getDurationInDays(duration: string): number {
  switch (duration) {
    case '2-weeks': return 14;
    case '4-weeks': return 28;
    case '8-weeks': return 56;
    case '12-weeks': return 84;
    default: return 28;
  }
}

class AutogenService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request<T>(endpoint: string, method: string, data?: any): Promise<AutogenResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`Requesting ${method} ${url}`);
      
      const response = await axios({
        method,
        url,
        data,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check if we have a response body
      if (!response.data) {
        console.error('Empty response received from server');
        return {
          success: false,
          data: null,
          error: {
            message: 'Empty response received from server',
            code: 'EMPTY_RESPONSE',
            metadata: {
              timestamp: new Date().toISOString(),
              status: response.status,
              statusText: response.statusText
            }
          },
          metadata: {
            timestamp: new Date().toISOString(),
            status: response.status,
            statusText: response.statusText
          }
        };
      }

      // Check if the response is in the expected format
      if (typeof response.data.success !== 'boolean') {
        console.error('Unexpected response format, missing success flag', response.data);
        
        // Try to adapt to the response format if possible
        if (response.status >= 200 && response.status < 300) {
          // Assume success if status code is 2xx
          return {
            success: true,
            data: response.data as T
          };
        } else {
          return {
            success: false,
            data: null,
            error: {
              message: 'Unexpected response format from server',
              code: 'INVALID_RESPONSE_FORMAT',
              metadata: {
                timestamp: new Date().toISOString(),
                status: response.status,
                statusText: response.statusText
              }
            },
            metadata: {
              timestamp: new Date().toISOString(),
              status: response.status,
              statusText: response.statusText
            }
          };
        }
      }

      // Check if the response was successful
      if (!response.data.success) {
        throw {
          message: response.data.error || 'Unknown error occurred',
          code: 'API_ERROR',
          metadata: {
            timestamp: new Date().toISOString(),
            status: response.status,
            statusText: response.statusText
          }
        };
      }

      // Validate data exists when success is true
      if (response.data.success && response.data.data === undefined) {
        console.warn('Success response without data payload', response.data);
        return {
          success: true,
          data: {} as T, // Return empty object as fallback
          metadata: {
            timestamp: new Date().toISOString(),
            status: response.status,
            statusText: response.statusText,
            warning: 'Response marked as success but contained no data'
          }
        };
      }

      return {
        success: true,
        data: response.data.data as T,
        metadata: {
          timestamp: new Date().toISOString(),
          status: 200,
          statusText: 'OK'
        }
      };
    } catch (error) {
      console.error('Error in autogen service request:', error);
      
      // Properly type and handle Axios errors
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        const metadata: AutogenMetadata = {
          timestamp: new Date().toISOString(),
          status: axiosError.response?.status || 500,
          statusText: axiosError.response?.statusText || 'Internal Server Error'
        };
        
        // Handle validation errors (422 status code)
        if (axiosError.response?.status === 422 && axiosError.response.data) {
          let errorMessage = 'Validation error';
          try {
            const errorData = axiosError.response.data as any;
            if (errorData.detail && Array.isArray(errorData.detail)) {
              // Extract validation error details
              const validationErrors = errorData.detail.map((err: any) => 
                `${err.loc.join('.')}: ${err.msg}`
              ).join('; ');
              errorMessage = `Validation errors: ${validationErrors}`;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (parseError) {
            console.error('Error parsing validation error response:', parseError);
          }
          
          return {
            success: false,
            data: null,
            error: {
              message: errorMessage,
              code: 'VALIDATION_ERROR',
              metadata
            },
            metadata
          };
        }
        
        // Handle other error types
        return {
          success: false,
          data: null,
          error: {
            message: axiosError.response?.data && typeof axiosError.response.data === 'object' 
              ? (axiosError.response.data as any).error || axiosError.message || 'Error processing request' 
              : axiosError.message || 'Error processing request',
            code: axiosError.response?.status ? `HTTP_${axiosError.response.status}` : 'NETWORK_ERROR',
            metadata
          },
          metadata
        };
      }
      
      // Handle non-Axios errors
      const metadata: AutogenMetadata = {
        timestamp: new Date().toISOString(),
        status: 500,
        statusText: 'Internal Server Error'
      };
      
      return {
        success: false,
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'UNKNOWN_ERROR',
          metadata
        },
        metadata
      };
    }
  }

  // Course Generation
  async generateCourseOutline(
    topic: string,
    difficulty: "beginner" | "intermediate" | "advanced",
    duration: "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks",
    seed?: string
  ): Promise<AutogenResponse<Course>> {
    try {
      console.log(`Generating course outline for topic: ${topic}, difficulty: ${difficulty}, duration: ${duration}`);
      
      const response = await this.request<Course>('/course/generate', 'POST', {
        topic,
        difficulty,
        duration,
        seed
      });

      console.log(`Course generation response received, success: ${response.success}`);
      
      // Post-process course structure to ensure all required fields
      if (response.success && response.data) {
        const course = response.data;
        console.log(`Processing course with ${course.modules?.length || 0} modules`);
        
        // Ensure all modules have proper structure
        if (course.modules && Array.isArray(course.modules)) {
          console.log(`Course has ${course.modules.length} modules`);
          
          // Sort modules by order if available
          if (course.modules.some(m => m.order !== undefined)) {
            course.modules.sort((a, b) => (a.order || 0) - (b.order || 0));
          }
          
          course.modules.forEach((module, index) => {
            // Ensure module has an ID
            if (!module.id) {
              module.id = `module_${index + 1}`;
            }
            
            // Ensure module name exists
            if (!module.name && (module as any).title) {
              module.name = (module as any).title;
            }
            
            // Ensure module has order
            if (module.order === undefined) {
              module.order = index;
            }
            
            // Ensure module has duration
            if (module.duration === undefined) {
              // Set a reasonable default based on course duration
              const durationMapping = {
                "2-weeks": 3,
                "4-weeks": 5,
                "8-weeks": 7,
                "12-weeks": 10
              };
              module.duration = durationMapping[duration] || 5;
            }
            
            // Ensure module has lessons array
            if (!module.lessons) {
              module.lessons = [];
            }
            
            // Ensure lesson properties
            module.lessons.forEach((lesson, lIndex) => {
              if (!lesson.id) {
                lesson.id = `lesson_${index + 1}_${lIndex + 1}`;
              }
              
              if (!lesson.title && (lesson as any).name) {
                lesson.title = (lesson as any).name;
              }
              
              if (!lesson.sessions) {
                lesson.sessions = [];
              }
              
              if (!lesson.exercises) {
                lesson.exercises = [];
              }
              
              if (!lesson.resources) {
                lesson.resources = [];
              }
              
              // Default completion status
              if (lesson.completed === undefined) {
                lesson.completed = false;
              }
              
              if (lesson.progress === undefined) {
                lesson.progress = 0;
              }
              
              // Ensure order is set
              if (lesson.order === undefined) {
                lesson.order = lIndex;
              }
            });
            
            // Default completion status
            if (module.completed === undefined) {
              module.completed = false;
            }
            
            if (module.progress === undefined) {
              module.progress = 0;
            }
            
            console.log(`Processed module: ${module.name} with ${module.lessons.length} lessons`);
          });
        } else {
          console.warn('Course has no modules or modules is not an array');
          course.modules = [];
        }
        
        // Calculate course progress if not provided
        if (course.progress === undefined && course.modules) {
          const completedModules = course.modules.filter(m => m.completed).length;
          course.progress = (completedModules / Math.max(1, course.modules.length)) * 100;
        }
        
        // Ensure total days is calculated
        if (course.totalDays === undefined) {
          course.totalDays = course.modules.reduce((total, module) => total + (module.duration || 0), 0);
        }
        
        // Set creation timestamp if not present
        if (!course.createdAt) {
          course.createdAt = new Date().toISOString();
        }
        
        if (!course.updatedAt) {
          course.updatedAt = new Date().toISOString();
        }
        
        // Ensure user_id exists
        if (!course.user_id) {
          course.user_id = 'default_user';
        }
        
        console.log(`Finished processing course with ${course.modules.length} modules`);
      }

      return response;
    } catch (error) {
      console.error('Error generating course outline:', error);
      return {
        success: false,
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate course outline',
          code: 'GENERATION_ERROR',
          metadata: { 
            timestamp: new Date().toISOString(),
            status: 500,
            statusText: 'Internal Server Error'
          }
        },
        metadata: { 
          timestamp: new Date().toISOString(),
          status: 500,
          statusText: 'Internal Server Error'
        }
      };
    }
  }

  // Content Generation
  async generateContent(
    topic: string,
    type: 'text' | 'code' | 'visual' | 'practice',
    context?: any,
    seed?: string
  ): Promise<AutogenResponse<any>> {
    try {
      const response = await this.request<any>('/content/generate', 'POST', {
        topic,
        type,
        context,
        seed
      });

      // Type-specific post-processing and validation
      if (response.success && response.data) {
        switch (type) {
          case 'visual':
            // Ensure visual content has required fields
            if (!response.data.type && response.data.visualType) {
              response.data.type = response.data.visualType;
            }
            if (!response.data.code && response.data.content) {
              response.data.code = response.data.content;
            }
            break;
          case 'code':
            // Ensure code content has required fields
            if (!response.data.language && context?.language) {
              response.data.language = context.language;
            }
            if (!response.data.title && response.data.description) {
              response.data.title = `${topic} Code Example`;
            }
            break;
          case 'practice':
            // Ensure practice content has proper structure
            if (Array.isArray(response.data) && response.data.length > 0) {
              // Convert array to expected structure if needed
              response.data = {
                exercises: response.data
              };
            }
            break;
        }
      }

      return response;
    } catch (error) {
      console.error('Error generating content:', error);
      return {
        success: false,
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate content',
          metadata: {
            timestamp: new Date().toISOString(),
            status: 0,
            statusText: ''
          },
          code: ''
        }
      };
    }
  }

  // Assessment Generation
  async generateAssessment(
    topic: string,
    type: 'quiz' | 'test' | 'practice',
    count: number = 5,
    seed?: string
  ): Promise<AutogenResponse<MCQuestion[]>> {
    const response = await this.request<any>('/assessment/generate', 'POST', {
      topic,
      type,
      count,
      seed,
    });
    
    // Check if request was successful
    if (!response.success) {
      return response as AutogenResponse<MCQuestion[]>;
    }
    
    // Handle case where we get data but no questions array
    if (!response.data || !response.data.questions) {
      console.error('Assessment API response missing questions array', response);
      return {
        success: false,
        data: null,
        error: {
          message: 'Invalid response format: Missing questions array',
          metadata: {
            timestamp: new Date().toISOString(),
            status: 0,
            statusText: ''
          },
          code: ''
        }
      };
    }
    
    // Define categories based on question content for learning assessment
    const inferCategories = (question: string, options: string[]): string => {
      question = question.toLowerCase();
      const optionsText = options.join(' ').toLowerCase();
      
      if (question.includes('prefer') || question.includes('like') || question.includes('enjoy')) {
        return 'preferences';
      }
      if (question.includes('learn best') || question.includes('learning style')) {
        return 'learning_style';
      }
      if (question.includes('time') || question.includes('hours') || question.includes('schedule')) {
        return 'time_availability';
      }
      if (question.includes('experience') || question.includes('familiar') || question.includes('knowledge')) {
        return 'prior_experience';
      }
      if (question.includes('challenge') || question.includes('difficult') || question.includes('struggle')) {
        return 'challenges';
      }
      if (question.includes('goal') || question.includes('achieve') || question.includes('want to')) {
        return 'goals';
      }
      
      // Default category
      return 'general_knowledge';
    };
    
    // Ensure each question has all required fields
    const processedQuestions = response.data.questions.map((q: any, index: number) => {
      // Set default values for any missing required fields
      const question: MCQuestion = {
        id: q.id || `q_${index + 1}`,
        type: q.type || 'multiple_choice',
        question: q.question || 'Question text unavailable',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'medium',
        weight: q.weight || 1
      };
      
      // If content field exists, this is likely a fallback format
      if (q.content && !q.question) {
        question.question = 'Error parsing questions';
        question.content = q.content;
        question.type = 'text';
      }

      // If category is missing, infer it from question content
      if (!q.category) {
        question.category = inferCategories(question.question, question.options);
      } else {
        question.category = q.category;
      }
      
      return question;
    });
    
    return {
      success: true,
      data: processedQuestions,
    };
  }

  // Chat Interaction
  async chat(
    message: string,
    context?: any,
    seed?: string
  ): Promise<AutogenResponse<{ response: string }>> {
    return this.request('/chat', 'POST', {
      message,
      context,
      seed,
    });
  }

  // Collaborative Tasks
  async executeCollaborativeTask(
    topic: string,
    context?: any,
    seed?: string
  ): Promise<AutogenResponse<any>> {
    return this.request('/collaborative/task', 'POST', {
      topic,
      context,
      seed,
    });
  }

  // Code Exercise Generation
  async generateCodeExercise(
    topic: string,
    language: string,
    difficulty: string,
    context?: {
      concepts: string[];
      prerequisites: string[];
    }
  ): Promise<AutogenResponse<CodePlaygroundExercise>> {
    return this.request<CodePlaygroundExercise>('/code/exercise', 'POST', {
      topic,
      language,
      difficulty,
      context
    });
  }

  // Practice Session Analysis
  async analyzePracticeSession(session: PracticeSession): Promise<AutogenResponse<PracticeReport>> {
    return this.request<PracticeReport>('/practice/analyze', 'POST', { session });
  }

  // Visual Content Generation
  async generateVisualContent(
    type: 'diagram' | 'mindmap' | 'infographic',
    topic: string,
    context?: any
  ): Promise<AutogenResponse<any>> {
    return this.request('/content/generate', 'POST', {
      topic,
      type: 'visual',
      context: {
        visualType: type,
        ...context,
      },
    });
  }

  // Flashcard Generation
  async generateFlashcards(
    topic: string,
    count: number,
    seed?: string
  ): Promise<AutogenResponse<Flashcard[]>> {
    return this.request<Flashcard[]>('/content/flashcards', 'POST', {
      topic,
      count,
      seed
    });
  }

  // Course Generation from Assessment
  async generateCourseFromAssessment(
    topic: string,
    assessment: UserAssessment,
    duration: "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks",
    seed?: string
  ): Promise<AutogenResponse<Course>> {
    return this.request<Course>('/course/generate-from-assessment', 'POST', {
      topic,
      assessment,
      duration,
      seed,
    });
  }

  // Visual Content Generation
  async generateDiagram(topic: string, seed?: string): Promise<AutogenResponse<VisualResponse>> {
    return this.request<VisualResponse>('/visual/diagram', 'POST', { topic, seed });
  }

  async generateMindMap(topic: string, concepts: string[], seed?: string): Promise<AutogenResponse<VisualResponse>> {
    return this.request<VisualResponse>('/visual/mindmap', 'POST', { topic, concepts, seed });
  }

  async generateInfographic(topic: string, data: any, seed?: string): Promise<AutogenResponse<VisualResponse>> {
    return this.request<VisualResponse>('/visual/infographic', 'POST', { topic, data, seed });
  }

  async generateTimeline(events: Array<{title: string, description: string, date: string}>, seed?: string): Promise<AutogenResponse<VisualResponse>> {
    return this.request<VisualResponse>('/visual/timeline', 'POST', { events, seed });
  }

  async generateConceptMap(concepts: Array<{from: string, to: string, relationship: string}>, seed?: string): Promise<AutogenResponse<VisualResponse>> {
    return this.request<VisualResponse>('/visual/concept-map', 'POST', { concepts, seed });
  }

  // Practice and Assessment
  async generatePracticeContent(
    topic: string,
    difficulty: string,
    previousInteractions: PracticeInteraction[]
  ): Promise<AutogenResponse<PracticeInteraction>> {
    return this.request<PracticeInteraction>('/practice/generate', 'POST', {
      topic,
      difficulty,
      previousInteractions,
    });
  }

  async evaluateCode(
    exercise: CodePlaygroundExercise,
    submittedCode: string,
  ): Promise<AutogenResponse<CodeExecutionResult>> {
    return this.request<CodeExecutionResult>('/code/evaluate', 'POST', {
      exercise,
      submittedCode,
    });
  }

  async getCodeHint(
    exercise: CodePlaygroundExercise,
    submittedCode: string,
    error?: string
  ): Promise<AutogenResponse<string>> {
    return this.request<string>('/code/hint', 'POST', {
      exercise,
      submittedCode,
      error,
    });
  }

  // Quiz and Flashcards
  async generateQuizQuestions(
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
    seed?: string
  ): Promise<AutogenResponse<MCQuestion[]>> {
    return this.request<MCQuestion[]>('/quiz/generate', 'POST', {
      topic,
      difficulty,
      count,
      seed,
    });
  }

  // Content Analysis and Generation
  async summarizeContent(
    content: string,
    maxLength: number,
    seed?: string
  ): Promise<AutogenResponse<ContentSummary>> {
    return this.request<ContentSummary>('/content/summarize', 'POST', {
      content,
      maxLength,
      seed,
    });
  }

  async generateLearningObjectives(
    topic: string,
    level: 'beginner' | 'intermediate' | 'advanced',
    count: number,
    seed?: string
  ): Promise<AutogenResponse<LearningObjective[]>> {
    return this.request<LearningObjective[]>('/content/objectives', 'POST', {
      topic,
      level,
      count,
      seed,
    });
  }

  async generateStudyPlan(
    topic: string,
    timeAvailable: string,
    difficulty: string,
    seed?: string
  ): Promise<AutogenResponse<StudyPlan>> {
    try {
      const response = await this.request<StudyPlan>('/study/plan', 'POST', {
        topic,
        timeAvailable,
        difficulty,
        seed
      });

      // Validate the study plan
      if (response.success && response.data) {
        const studyPlan = response.data;
        
        // Ensure we have valid title and description
        if (!studyPlan.title) {
          studyPlan.title = `Study Plan for ${topic}`;
        }
        
        if (!studyPlan.description) {
          studyPlan.description = `A ${difficulty} level study plan for ${topic}`;
        }
        
        // Ensure sessions array exists
        if (!studyPlan.sessions || !Array.isArray(studyPlan.sessions)) {
          studyPlan.sessions = [];
        }
      }

      return response;
    } catch (error) {
      console.error('Error generating study plan:', error);
      return {
        success: false,
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate study plan',
          metadata: {
            timestamp: new Date().toISOString(),
            status: 0,
            statusText: ''
          },
          code: ''
        }
      };
    }
  }

  async generatePracticeProblems(
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
    includeSolutions: boolean,
    seed?: string
  ): Promise<AutogenResponse<PracticeProblem[]>> {
    return this.request<PracticeProblem[]>('/practice/problems', 'POST', {
      topic,
      difficulty,
      count,
      includeSolutions,
      seed
    });
  }

  async generatePersona(
    userInput: string,
    topic: string
  ): Promise<AutogenResponse<any>> {
    return this.request('/persona/generate', 'POST', {
      userInput,
      topic
    });
  }

  async updatePersona(
    personaId: string,
    changes: string
  ): Promise<AutogenResponse<any>> {
    return this.request('/persona/update', 'POST', {
      personaId,
      changes
    });
  }

  async generateCourseWithPersona(
    personaId: string,
    topic: string,
    difficulty: "beginner" | "intermediate" | "advanced",
    duration: "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks"
  ): Promise<AutogenResponse<Course>> {
    try {
      const response = await this.request<any>('/course/generate-with-persona', 'POST', {
        personaId,
        topic,
        difficulty,
        duration
      });

      if (!response.success || !response.data) {
        console.error('Failed to generate course with persona:', response.error);
        return response;
      }

      // Create a structured course object from the response
      const courseData = response.data;
      console.log('Course data received:', courseData);
      
      // If courseData already has valid format, use it directly
      if (courseData.id && courseData.title && courseData.modules && Array.isArray(courseData.modules)) {
        // Ensure course has all necessary fields
        const course: Course = {
          ...courseData,
          difficulty: courseData.difficulty || difficulty,
          duration: courseData.duration || duration,
          totalDays: getDurationInDays(courseData.duration || duration),
          createdAt: courseData.createdAt || new Date().toISOString(),
          updatedAt: courseData.updatedAt || new Date().toISOString(),
          user_id: courseData.user_id || 'current_user',
          progress: courseData.progress || 0,
          prerequisites: courseData.prerequisites || [],
          learningGoals: courseData.learningObjectives || courseData.learningGoals || [],
          assessment: courseData.assessment || []
        };
        
        // Ensure modules have proper structure
        course.modules = courseData.modules.map((module: any, index: number) => {
          return {
            id: module.id || `module_${course.id}_${index}`,
            name: module.title || module.name || `Module ${index + 1}`,
            description: module.description || '',
            order: index,
            duration: module.duration || 0,
            lessons: Array.isArray(module.lessons) ? module.lessons.map((lesson: any, lessonIndex: number) => ({
              id: lesson.id || `lesson_${module.id}_${lessonIndex}`,
              title: lesson.title || `Lesson ${lessonIndex + 1}`,
              content: lesson.content || lesson.contentSummary || '',
              order: lessonIndex,
              duration: lesson.estimatedDuration || 60,
              completed: false,
              sessions: [],
              exercises: lesson.exercises || [],
              resources: lesson.resources || [],
              progress: 0
            })) : [],
            completed: false,
            progress: 0
          };
        });
        
        console.log('Course processed successfully:', course.id);
        return {
          success: true,
          data: course,
          metadata: response.metadata
        };
      }
      
      // If backend response doesn't match expected format, create course structure
      console.log('Creating fallback course structure');
      const courseId = courseData.id || `course_${Date.now()}`;
      
      const totalDays = (() => {
        switch (duration) {
          case '2-weeks': return 14;
          case '4-weeks': return 28;
          case '8-weeks': return 56;
          case '12-weeks': return 84;
          default: return 28;
        }
      })();
      
      // Create the base course structure
      const course: Course = {
        id: courseId,
        title: courseData.title || `Course on ${topic}`,
        description: courseData.description || 'No description provided.',
        prerequisites: courseData.prerequisites || [],
        learningGoals: courseData.learningObjectives || [],
        modules: [],
        assessment: [],
        difficulty,
        duration,
        totalDays,
        createdAt: courseData.createdAt || new Date().toISOString(),
        updatedAt: courseData.updatedAt || new Date().toISOString(),
        user_id: 'current_user',
        progress: 0
      };
      
      // Process modules if they exist
      if (courseData.modules && Array.isArray(courseData.modules)) {
        course.modules = courseData.modules.map((module: any, index: number) => {
          const moduleId = module.id || `module_${courseId}_${index}`;
          return {
            id: moduleId,
            name: module.title || `Module ${index + 1}`,
            description: module.description || '',
            order: index,
            duration: 0,
            lessons: Array.isArray(module.lessons) ? module.lessons.map((lesson: any, lessonIndex: number) => ({
              id: lesson.id || `lesson_${moduleId}_${lessonIndex}`,
              title: lesson.title || `Lesson ${lessonIndex + 1}`,
              content: lesson.content || lesson.contentSummary || '',
              order: lessonIndex,
              duration: lesson.estimatedDuration || 60,
              completed: false,
              sessions: [],
              exercises: lesson.exercises || [],
              resources: lesson.resources || [],
              progress: 0
            })) : [],
            completed: false,
            progress: 0
          };
        });
      } else {
        // Create at least one default module if none exist
        console.warn('No modules found in course data, creating default module');
        course.modules = [
          {
            id: `module_${courseId}_0`,
            name: `Introduction to ${topic}`,
            description: `An overview of ${topic} fundamentals.`,
            order: 0,
            duration: 0,
            lessons: [
              {
                id: `lesson_${courseId}_0_0`,
                title: `Getting Started with ${topic}`,
                content: `This lesson introduces you to ${topic}.`,
                order: 0,
                duration: 60,
                completed: false,
                sessions: [],
                exercises: [],
                resources: [],
                progress: 0
              }
            ],
            completed: false,
            progress: 0
          }
        ];
      }

      console.log('Created fallback course with ID:', course.id);
      return {
        success: true,
        data: course,
        metadata: response.metadata
      };
    } catch (error) {
      console.error('Error generating course with persona:', error);
      return {
        success: false,
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate course with persona',
          code: 'GENERATION_ERROR',
          metadata: {
            timestamp: new Date().toISOString(),
            status: 500,
            statusText: 'Internal Server Error'
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          status: 500,
          statusText: 'Internal Server Error'
        }
      };
    }
  }

  async getPersonaContentForTopic(
    personaId: string,
    topic: string,
    contentType: 'summary' | 'introduction' | 'explanation'
  ): Promise<AutogenResponse<any>> {
    return this.request('/persona/content', 'POST', {
      personaId,
      topic,
      contentType
    });
  }

  async explainCode(code: string, language: string): Promise<AutogenResponse<CodeExplanation>> {
    return this.request<CodeExplanation>('/code/explain', 'POST', {
      code,
      language,
    });
  }

  async generatePersonalizedPath(topic: string, userLevel: string): Promise<AutogenResponse<PersonalizedPath>> {
    return this.request<PersonalizedPath>('/study/personalized-path', 'POST', {
      topic,
      userLevel,
    });
  }

  async generateInteractiveQuiz(topic: string, difficulty: string): Promise<AutogenResponse<QuizQuestion[]>> {
    return this.request<QuizQuestion[]>('/quiz/interactive', 'POST', {
      topic,
      difficulty,
    });
  }

  async provideFeedback(response: string, correctAnswer: string): Promise<AutogenResponse<string>> {
    return this.request<string>('/feedback', 'POST', {
      response,
      correctAnswer,
    });
  }

  async generateCustomContent(
    prompt: string,
    contentType: 'text' | 'image' | 'code' | 'diagram',
    params: GenerateCustomContentParams
  ): Promise<AutogenResponse<any>> {
    return this.request('/content/generate', 'POST', {
      prompt,
      contentType,
      ...params,
    });
  }

  async analyzeFile(
    file: File,
    params: AnalyzeFileParams
  ): Promise<AutogenResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(params).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
    return this.request('/file/analyze', 'POST', formData);
  }

  async getChatResponse(message: string, context: ChatContext, seed?: string): Promise<AutogenResponse<ChatResponse>> {
    return this.request<ChatResponse>('/chat', 'POST', {
      message,
      context,
      seed,
    });
  }

  async adaptCourseContent(courseId: string, report: PracticeReport): Promise<AutogenResponse<any>> {
    return this.request('/course/adapt', 'POST', {
      courseId,
      report,
    });
  }

  async generateSessionContent(
    sessionTitle: string, 
    sessionDuration: string,
    sessionObjectives: string[],
    lessonContext: string,
    moduleContext: string,
    difficulty: string,
    learningStyle?: string,
    seed?: string,
  ): Promise<AutogenResponse<SessionSection[]>> {
    try {
      const response = await this.request<any>('/session/generate', 'POST', {
        sessionTitle,
        sessionDuration,
        sessionObjectives,
        lessonContext,
        moduleContext,
        difficulty,
        learningStyle,
        seed,
      });

      // Post-process session sections
      if (response.success && response.data) {
        let sections: SessionSection[] = [];
        
        // Handle different response formats
        if (Array.isArray(response.data)) {
          // Direct array of sections
          sections = response.data.map((section, index) => ({
            id: section.id || `section_${index + 1}`,
            title: section.title || `Section ${index + 1}`,
            content: section.content || '',
            type: section.type || 'text',
            completed: false,
            order: section.order || index
          }));
        } else if (response.data.sections && Array.isArray(response.data.sections)) {
          // Sections property with array
          sections = response.data.sections.map((section, index) => ({
            id: section.id || `section_${index + 1}`,
            title: section.title || `Section ${index + 1}`,
            content: section.content || '',
            type: section.type || 'text',
            completed: false,
            order: section.order || index
          }));
        } else if (typeof response.data === 'object') {
          // Try to extract sections from object properties
          const extractedSections: any[] = [];
          Object.keys(response.data).forEach((key, index) => {
            const item = response.data[key];
            if (typeof item === 'object' && item.title && item.content) {
              extractedSections.push({
                id: item.id || `section_${index + 1}`,
                title: item.title,
                content: item.content,
                type: item.type || 'text',
                completed: false,
                order: item.order || index
              });
            }
          });
          
          if (extractedSections.length > 0) {
            sections = extractedSections;
          } else {
            // Fallback - create a single section from the entire response
            sections = [{
              id: 'section_1',
              title: sessionTitle,
              content: JSON.stringify(response.data),
              type: 'text',
              completed: false,
              order: 0
            }];
          }
        }
        
        // Ensure all sections have valid types
        sections.forEach(section => {
          if (!['text', 'code', 'visual', 'practice', 'quiz'].includes(section.type)) {
            section.type = 'text';
          }
        });
        
        // Sort by order
        sections.sort((a, b) => a.order - b.order);
        
        // Update response data
        response.data = sections;
      }

      return response;
    } catch (error) {
      console.error('Error generating session content:', error);
      return {
        success: false,
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate session content',
          metadata: {
            timestamp: new Date().toISOString(),
            status: 0,
            statusText: ''
          },
          code: ''
        }
      };
    }
  }

  async generateModuleLessons(
    courseId: string,
    moduleId: string,
    topic: string,
    moduleName: string,
    moduleDescription: string,
    difficulty: string = "beginner",
    learningStyle: Record<string, number> = {},
    userAssessment: any = null
  ): Promise<AutogenResponse<{ lessons: Lesson[] }>> {
    try {
      console.log(`Generating lessons for module ${moduleId} in course ${courseId}`);
      
      // Validate required parameters
      if (!courseId || !moduleId || !topic || !moduleName || !moduleDescription) {
        console.error('Missing required parameters for generateModuleLessons');
        const missingParams = [];
        if (!courseId) missingParams.push('courseId');
        if (!moduleId) missingParams.push('moduleId');
        if (!topic) missingParams.push('topic');
        if (!moduleName) missingParams.push('moduleName');
        if (!moduleDescription) missingParams.push('moduleDescription');
        
        return {
          success: false,
          data: null,
          error: {
            message: `Missing required parameters: ${missingParams.join(', ')}`,
            code: 'MISSING_PARAMETERS',
            metadata: {
              timestamp: new Date().toISOString(),
              status: 400,
              statusText: 'Bad Request'
            }
          },
          metadata: {
            timestamp: new Date().toISOString(),
            status: 400,
            statusText: 'Bad Request'
          }
        };
      }
      
      // Ensure difficulty is a string (not an object)
      const sanitizedDifficulty = typeof difficulty === 'string' 
        ? difficulty 
        : (typeof difficulty === 'object' ? 'beginner' : String(difficulty));
      
      console.log('Making request with params:', {
        course_id: courseId,
        module_id: moduleId,
        topic,
        module_name: moduleName,
        module_description: moduleDescription,
        difficulty: sanitizedDifficulty
      });
      
      const response = await this.request<{ lessons: Lesson[] }>('/module/generate-lessons', 'POST', {
        course_id: courseId,
        module_id: moduleId,
        topic,
        module_name: moduleName,
        module_description: moduleDescription,
        difficulty: sanitizedDifficulty,
        learning_style: learningStyle,
        user_assessment: userAssessment
      });
      
      if (!response.success || !response.data) {
        console.error('Failed to generate lessons for module:', response.error);
        return response;
      }
      
      // Process lessons to ensure they have all required fields
      const processedLessons = response.data.lessons.map((lesson, index) => {
        if (!lesson.id) {
          lesson.id = `lesson_${moduleId}_${index + 1}`;
        }
        
        if (!lesson.completed) {
          lesson.completed = false;
        }
        
        if (!lesson.progress) {
          lesson.progress = 0;
        }
        
        if (!lesson.exercises) {
          lesson.exercises = [];
        }
        
        if (!lesson.resources) {
          lesson.resources = [];
        }
        
        if (!lesson.sessions) {
          lesson.sessions = [];
        }
        
        return lesson;
      });
      
      return {
        success: true,
        data: { 
          lessons: processedLessons 
        },
        metadata: response.metadata
      };
    } catch (error) {
      console.error('Error generating module lessons:', error);
      return {
        success: false,
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate module lessons',
          metadata: {
            timestamp: new Date().toISOString(),
            status: 0,
            statusText: ''
          },
          code: ''
        }
      };
    }
  }
  
  // Generate Daily Learning Session
  async generateDailySession(
    userId: string,
    courseId: string,
    topic: string,
    moduleId?: string,
    lessonId?: string,
    difficulty: string = "beginner",
    learningStyle: Record<string, number> = {},
    previousSessions: any[] = [],
    durationMinutes: number = 30
  ): Promise<AutogenResponse<any>> {
    try {
      console.log(`Generating daily session for user ${userId}, course ${courseId}`);
      
      const response = await this.request<any>('/daily-session/generate', 'POST', {
        user_id: userId,
        course_id: courseId,
        module_id: moduleId,
        lesson_id: lessonId,
        topic,
        difficulty,
        learning_style: learningStyle,
        previous_sessions: previousSessions,
        duration_minutes: durationMinutes
      });
      
      if (!response.success || !response.data) {
        console.error('Failed to generate daily session:', response.error);
        return response;
      }
      
      // Process and validate session sections
      if (response.data.sections) {
        response.data.sections = response.data.sections.map((section: any, index: number) => {
          // Ensure all sections have necessary properties
          if (!section.id) {
            section.id = `section_${index + 1}`;
          }
          
          return section;
        });
      }
      
      return response;
    } catch (error) {
      console.error('Error generating daily session:', error);
      return {
        success: false,
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate daily session',
          metadata: {
            timestamp: new Date().toISOString(),
            status: 0,
            statusText: ''
          },
          code: ''
        }
      };
    }
  }

  // Generate Lesson Sessions
  async generateLessonSessions(
    lessonTitle: string,
    lessonContent: string,
    courseDifficulty: string = "beginner",
    lessonDuration: number = 30,
    moduleContext: string = ""
  ): Promise<AutogenResponse<Session[]>> {
    try {
      console.log(`Generating sessions for lesson: ${lessonTitle}`);
      
      // Using daily-session/generate endpoint instead of session/generate-for-lesson
      const response = await this.request<any>('/daily-session/generate', 'POST', {
        user_id: "system",  // Default user
        course_id: "lesson_session", // Identifier for context
        topic: lessonTitle,
        lesson_id: `lesson_${Date.now()}`, // Generate a temporary ID
        module_context: moduleContext,
        difficulty: courseDifficulty,
        duration_minutes: lessonDuration,
        lesson_content: lessonContent // Add as additional context
      });
      
      if (!response.success || !response.data) {
        console.error('Failed to generate lesson sessions:', response.error);
        return response;
      }
      
      // Process the response
      let sessions: Session[] = [];
      
      // Handle different response formats from daily-session/generate
      if (response.data.sections && Array.isArray(response.data.sections)) {
        // Convert daily session sections to a single session
        const sections = response.data.sections.map((section: any, sectionIndex: number) => ({
          id: section.id || `section_1_${sectionIndex + 1}`,
          title: section.title || `Section ${sectionIndex + 1}`,
          content: section.content || '',
          type: section.type || 'text',
          completed: false,
          order: section.order || sectionIndex
        }));
        
        sessions = [{
          id: response.data.id || 'session_1',
          title: response.data.title || `${lessonTitle} Session`,
          description: response.data.learningObjective || 'Auto-generated session from daily session',
          duration: response.data.duration || lessonDuration,
          completed: false,
          sections: sections
        }];
      } else if (Array.isArray(response.data)) {
        // Direct array of sections (fallback)
        sessions = [{
          id: 'session_1',
          title: `${lessonTitle} Session`,
          description: 'Auto-generated session',
          duration: lessonDuration,
          completed: false,
          sections: response.data.map((section: any, sectionIndex: number) => ({
            id: section.id || `section_1_${sectionIndex + 1}`,
            title: section.title || `Section ${sectionIndex + 1}`,
            content: section.content || '',
            type: section.type || 'text',
            completed: false,
            order: section.order || sectionIndex
          }))
        }];
      } else {
        // If we can't parse the response format, create a minimal session
        sessions = [{
          id: 'session_1',
          title: `${lessonTitle} Session`,
          description: 'Auto-generated session',
          duration: lessonDuration,
          completed: false,
          sections: [{
            id: 'section_1',
            title: 'Content',
            content: lessonContent,
            type: 'text',
            completed: false,
            order: 0
          }]
        }];
      }
      
      return {
        success: true,
        data: sessions,
        metadata: {
          timestamp: new Date().toISOString(),
          status: 200,
          statusText: 'OK'
        }
      };
    } catch (error) {
      console.error('Error generating lesson sessions:', error);
      return {
        success: false,
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate lesson sessions',
          code: 'GENERATION_ERROR',
          metadata: { 
            timestamp: new Date().toISOString(),
            status: 500,
            statusText: 'Internal Server Error'
          }
        },
        metadata: { 
          timestamp: new Date().toISOString(),
          status: 500,
          statusText: 'Internal Server Error'
        }
      };
    }
  }

  async chatWithPersona(
    personaId: string,
    message: string,
    history: ChatMessage[] = [],
    courseContext?: {
      courseId?: string;
      moduleId?: string;
      lessonId?: string;
      sessionId?: string;
    }
  ): Promise<AutogenResponse<{ response: string }>> {
    return this.request<{ response: string }>('/persona/chat', 'POST', {
      personaId,
      message,
      history,
      courseContext
    });
  }
}

// Create a singleton instance
const autogenService = new AutogenService();

export default autogenService; 