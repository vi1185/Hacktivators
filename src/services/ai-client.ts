import type { Course, Flashcard } from '@/types/course';

interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    attempts: number;
    duration: number;
    model: string;
    promptTokens: number;
    completionTokens: number;
    seed?: string;
  };
}

class AIClient {
  private readonly API_URL = '/api/ai';
  private readonly API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  private async request<T>(
    operation: string,
    params: any
  ): Promise<AIResponse<T>> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.API_KEY || '',
        },
        body: JSON.stringify({ operation, params }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API request failed',
      };
    }
  }

  public async generateCourseOutline(
    topic: string,
    difficulty: "beginner" | "intermediate" | "advanced",
    duration: "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks",
    seed?: string
  ): Promise<AIResponse<Course>> {
    return this.request<Course>('generateCourseOutline', {
      topic,
      difficulty,
      duration,
      seed,
    });
  }

  public async generateFlashcards(
    topic: string,
    count: number,
    seed?: string
  ): Promise<AIResponse<Flashcard[]>> {
    return this.request<Flashcard[]>('generateFlashcards', {
      topic,
      count,
      seed,
    });
  }

  // Add more methods for other AI operations...
}

// Create a singleton instance
const aiClient = new AIClient();

export default aiClient; 