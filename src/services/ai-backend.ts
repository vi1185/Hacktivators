import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Course, Session, Lesson, MCQuestion, UserAssessment, SessionSection, Module, Exercise, Resource } from "@/types/course";
import { toast } from "sonner";
import type { PracticeSession, PracticeReport, PracticeInteraction, CodePlaygroundExercise, CodeExecutionResult } from '@/types/practice';
import { RateLimiter } from '@/lib/rate-limiter';

// Environment variables for API keys
const AI_API_KEY = process.env.AI_API_KEY;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

if (!AI_API_KEY) {
  throw new Error("AI_API_KEY is not set in environment variables");
}

if (!BACKEND_API_KEY) {
  throw new Error("BACKEND_API_KEY is not set in environment variables");
}

interface AIMetadata {
  attempts: number;
  duration: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  seed?: string;
  [key: string]: any;
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: AIMetadata;
}

class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = "AIError";
  }
}

interface AIServiceConfig {
  apiKey: string;
  maxRetries: number;
  timeout: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  private rateLimiter: RateLimiter;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.config = config;
  }

  private async validateInput(input: any): Promise<void> {
    if (!input) {
      throw new Error('Input is required');
    }

    // Add more validation as needed
    if (typeof input !== 'object') {
      throw new Error('Input must be an object');
    }
  }

  private async handleRateLimit(identifier: string): Promise<void> {
    const allowed = await this.rateLimiter.check(identifier);
    if (!allowed) {
      throw new Error('Rate limit exceeded');
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  async generateCourseOutline(params: {
    topic: string;
    difficulty: string;
    duration: string;
    seed?: string;
  }): Promise<any> {
    await this.validateInput(params);
    await this.handleRateLimit(params.topic);

    return this.retryOperation(async () => {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Generate a course outline for ${params.topic} at ${params.difficulty} level, duration: ${params.duration}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  }

  async generateFlashcards(params: {
    topic: string;
    count: number;
    seed?: string;
  }): Promise<any> {
    await this.validateInput(params);
    await this.handleRateLimit(params.topic);

    return this.retryOperation(async () => {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Generate ${params.count} flashcards about ${params.topic}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  }

  // Add more AI operations as needed
}

// Create a singleton instance
const aiBackend = new AIService({
  apiKey: AI_API_KEY,
  maxRetries: 3,
  timeout: 60000,
  rateLimit: {
    maxRequests: 10,
    windowMs: 1500,
  },
});

export default aiBackend; 