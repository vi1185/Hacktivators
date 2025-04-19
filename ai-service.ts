import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { Course, Session, Lesson, MCQuestion, UserAssessment, SessionSection, Module, Exercise, Resource } from "@/types/course";
import { HfInference } from '@huggingface/inference';

interface RawCourseResponse {
  title: string;
  description: string;
  prerequisites: any[];
  learningGoals: any[];
  modules: any[];
  assessment: any;
  difficulty?: string;
  duration?: string;
}

interface RawLessonResponse {
  lessons: any[];
}

// Environment variables should be handled through import.meta.env in Vite
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const HUGGINGFACE_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.warn("No Gemini API key found");
}

if (!HUGGINGFACE_API_KEY) {
  console.warn("No HuggingFace API key found");
}

interface AIResponse<T = any> {
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

interface CourseData {
  id: string;
  title: string;
  description: string;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    lessons: Array<{
      id: string;
      title: string;
      content: string;
    }>;
  }>;
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

export interface AIServiceInterface {
  generateCourseOutline(
    topic: string,
    difficulty: "beginner" | "intermediate" | "advanced",
    duration: "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks",
    seed?: string,
  ): Promise<AIResponse<Course>>;
  generateModuleLessons(
    moduleTitle: string,
    moduleDescription: string,
    courseDifficulty: string,
    courseDuration: string,
    seed?: string,
    courseContext?: {
      courseTitle: string;
      learningGoals: string[];
      prerequisites: string[];
    }
  ): Promise<AIResponse<Lesson[]>>;
  generateLessonSessions(
    lessonTitle: string,
    lessonContent: string,
    courseDifficulty: string,
    lessonDuration: number,
    moduleContext: string,
    seed?: string,
  ): Promise<AIResponse<Session[]>>;
  generateSessionContent(
    sessionTitle: string, 
    sessionDuration: string,
    sessionObjectives: string[],
    lessonContext: string,
    moduleContext: string,
    difficulty: string,
    learningStyle?: string,
    seed?: string,
  ): Promise<AIResponse<SessionSection[]>>;
  generateAssessmentQuestions(topic: string, seed?: string): Promise<AIResponse<MCQuestion[]>>;
  generateCourseFromAssessment(
    topic: string,
    assessment: UserAssessment,
    duration: "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks",
    seed?: string,
  ): Promise<AIResponse<Course>>;
}

interface CourseGenerationParams {
  topic: string;
  difficulty: string;
  duration: string;
  userId: string;
}

interface AssessmentGenerationParams {
  topic: string;
  userId: string;
  answers: string[];
}

interface Question {
  id: number;
  text: string;
  options: string[];
}

export class AIService implements AIServiceInterface {
  static generateSessionContent(title: string, duration: string, objectives: string[], arg3: string, name: string, arg5: string) {
    throw new Error("Method not implemented.");
  }
  private gemini: GoogleGenerativeAI;
  private hf: HfInference;
  private lastCallTime = 0;
  private readonly RATE_LIMIT_DELAY = 1500;
  private readonly DEFAULT_MODEL = "gemini-2.0-pro-exp-02-05";
  private readonly TIMEOUT = 60000;
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.gemini = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.hf = new HfInference(HUGGINGFACE_API_KEY);
  }

  private getModel() {
    return this.gemini.getGenerativeModel({
      model: this.DEFAULT_MODEL,
    });
  }

  private getGenerationConfig(seed?: string) {
    return {
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };
  }

  private async generateWithAI(prompt: string, template?: string, seed?: string): Promise<any> {
    console.log("Starting AI generation with Google AI...");

    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | null = null;
    const randomSeed = seed || Math.floor(Math.random() * 1000000).toString();

    while (attempts < this.MAX_RETRIES) {
      try {
        console.log(`Attempt ${attempts + 1} of ${this.MAX_RETRIES} with seed: ${randomSeed}`);
        
        // Rate limiting
        const now = Date.now();
        const timeSinceLastCall = now - this.lastCallTime;
        if (timeSinceLastCall < this.RATE_LIMIT_DELAY) {
          await new Promise((resolve) => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastCall));
        }
        this.lastCallTime = Date.now();

        const model = this.getModel();
        const generationConfig = this.getGenerationConfig(seed);

        const systemPrompt = `You are an expert educational content designer and curriculum developer. Create detailed, pedagogically sound course content following these principles:
1. Be precise and concise
2. Use pedagogically sound learning progressions
3. Focus on practical, applicable knowledge
4. Include clear learning objectives
5. Design for the specified skill level
6. Return ONLY valid JSON following this format:
${template || ""}

Your response MUST be ONLY the JSON array/object, nothing else. No explanations, comments or text outside the JSON structure.`;

        const chatSession = model.startChat({
          generationConfig,
          history: [
            {
              role: "user",
              parts: [{ text: systemPrompt }],
            },
            {
              role: "model",
              parts: [{ text: "I understand. I'll respond with only valid JSON following your specified format." }],
            },
          ],
        });

        const result = await chatSession.sendMessage(prompt);
        const responseText = result.response.text();

        if (!responseText) {
          throw new AIError("Empty response from AI model", "EMPTY_RESPONSE");
        }

        console.log("Raw AI response:", responseText);

        const cleaned = this.cleanJsonResponse(responseText);

        return {
          data: cleaned,
          metadata: {
            attempts: attempts + 1,
            duration: Date.now() - startTime,
            model: this.DEFAULT_MODEL,
            promptTokens: prompt.length,
            completionTokens: responseText.length,
            seed: randomSeed,
          },
        };
      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        lastError = error as Error;
        attempts++;

        if (attempts === this.MAX_RETRIES) {
          throw new AIError(`Failed after ${this.MAX_RETRIES} attempts: ${lastError.message}`, "MAX_ATTEMPTS_REACHED", {
            attempts,
            duration: Date.now() - startTime,
            lastError: lastError.message,
            model: this.DEFAULT_MODEL,
          });
        }

        const delay = Math.min(1000 * Math.pow(2, attempts) + Math.random() * 1000, 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new AIError("Failed to generate content", "UNKNOWN_ERROR");
  }

  private cleanJsonResponse(text: string): any {
    console.log("Starting JSON cleaning process...");

    try {
      // Try to extract JSON from the text
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
      
      return JSON.parse(text);
    } catch (error) {
      console.log("Direct parsing failed, attempting cleanup...");

      const startChar = text.indexOf("{") !== -1 ? "{" : "[";
      const endChar = startChar === "{" ? "}" : "]";
      
      const startIndex = text.indexOf(startChar);
      if (startIndex === -1) {
        throw new AIError("No valid JSON structure found", "INVALID_FORMAT");
      }

      let bracketCount = 1;
      let endIndex = startIndex + 1;

      while (bracketCount > 0 && endIndex < text.length) {
        if (text[endIndex] === startChar) bracketCount++;
        if (text[endIndex] === endChar) bracketCount--;
        endIndex++;
      }

      if (bracketCount !== 0) {
        throw new AIError("Unmatched brackets in response", "INVALID_FORMAT");
      }

      let jsonText = text.substring(startIndex, endIndex);

      jsonText = jsonText
        .replace(/}[^}]*$/, "}")
        .replace(/\\][^\\]]*$/, "]")
        .replace(/([{,]\\s*)(\\w+):/g, '$1"$2":')
        .replace(/'/g, '"')
        .replace(/\\"/g, '"')
        .replace(/"([^"]*)""/g, '"$1"')
        .replace(/,(\\s*[}\\]])/g, "$1")
        .replace(/"([^"]*?)n't"/g, '"$1not"')
        .replace(/"duration":\\s*(\\d+)[^,}]+/g, '"duration": $1');

      console.log("Cleaned JSON:", jsonText);

      try {
        return JSON.parse(jsonText);
      } catch (error) {
        console.error("JSON Parse Error:", error);
        console.error("Cleaned JSON Text:", jsonText);
        throw new AIError("Failed to parse cleaned JSON", "PARSE_ERROR", {
          originalText: text,
          cleanedText: jsonText,
          parseError: error,
        });
      }
    }
  }

  private validateCourseResponse(data: any): RawCourseResponse {
    console.log("Validating course response:", data);

    if (!data || typeof data !== "object") {
      throw new AIError("Invalid response format", "VALIDATION_ERROR");
    }

    const requiredFields = ["title", "description", "prerequisites", "learningGoals", "modules", "assessment"];
    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      throw new AIError(`Missing required fields: ${missingFields.join(", ")}`, "VALIDATION_ERROR");
    }

    if (!Array.isArray(data.modules)) {
      if (Array.isArray(data.weeks)) {
        console.log("Converting weeks format to modules format");
        data.modules = [];
        
        data.weeks.forEach((week: any, weekIndex: number) => {
          if (week.modules && Array.isArray(week.modules)) {
            week.modules.forEach((module: any, moduleIndex: number) => {
              data.modules.push({
                title: module.title || `Module ${data.modules.length + 1}`,
                description: module.description || "",
                duration: module.duration || 7,
                order: data.modules.length
              });
            });
          } else {
            data.modules.push({
              title: week.title || `Week ${weekIndex + 1}`,
              description: week.description || "",
              duration: week.duration || 7,
              order: data.modules.length
            });
          }
        });
      } else {
        console.warn("No modules or weeks found in course data, initializing empty array");
        data.modules = [];
      }
    }

    data.modules = data.modules.map((module: any, index: number) => {
      if (!module.title && !module.name) {
        throw new AIError(`Module ${index + 1} missing required title/name field`, "VALIDATION_ERROR");
      }

      return {
        ...module,
        name: module.title || module.name,
        title: module.title || module.name,
        duration: typeof module.duration === "number" ? module.duration : 7,
        description: module.description || `Module content for ${module.title || module.name}`,
        lessons: Array.isArray(module.lessons) ? module.lessons : []
      };
    });

    if (!Array.isArray(data.prerequisites)) {
      data.prerequisites = [data.prerequisites].filter(Boolean);
    }

    if (!Array.isArray(data.learningGoals)) {
      data.learningGoals = [data.learningGoals].filter(Boolean);
    }

    if (typeof data.assessment === "string") {
      data.assessment = {
        type: "General Assessment",
        description: data.assessment,
        methods: [data.assessment],
      };
    } else if (Array.isArray(data.assessment)) {
      data.assessment = {
        type: "Multiple Methods",
        description: "Multiple assessment methods will be used",
        methods: data.assessment,
      };
    } else if (typeof data.assessment === "object" && !data.assessment.methods) {
      data.assessment.methods = [data.assessment.description];
    }

    return data as RawCourseResponse;
  }

  private validateLessonResponse(data: any): RawLessonResponse {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid lesson response format");
    }

    if (Array.isArray(data)) {
      data = { lessons: data };
    }

    if (!Array.isArray(data.lessons)) {
      if (typeof data === "object" && Object.keys(data).length > 0) {
        data.lessons = Object.entries(data).map(([key, value]: [string, any]) => ({
          title: value.title || key,
          content: value.content || value.description || "",
          exercises: [],
          resources: [],
        }));
      } else {
        data.lessons = [];
      }
    }

    data.lessons = data.lessons.map((lesson: any, index: number) => ({
      id: `lesson_${Date.now()}_${index}`,
      title: lesson.title || `Lesson ${index + 1}`,
      content: lesson.content || lesson.description || "",
      exercises: (lesson.exercises || []).map((exercise: any) => ({
        id: `exercise_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        title: exercise.title || "",
        description: exercise.description || "",
        type: exercise.type || "practice",
        completed: false,
      })),
      resources: (lesson.resources || []).map((resource: any) => ({
        id: `resource_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        title: resource.title || "",
        type: resource.type || "article",
        url: resource.url || "#",
      })),
      order: index,
      duration: lesson.duration || 1,
      completed: false,
      sessions: [],
      progress: 0,
    }));

    return data as RawLessonResponse;
  }

  private validateAndCleanMCQuestions(questions: any[]): MCQuestion[] {
    if (!Array.isArray(questions)) {
      throw new AIError("Questions must be an array", "INVALID_FORMAT");
    }

    const validCategories = new Set([
      "learning_style",
      "time_availability",
      "prior_experience",
      "goals",
      "preferences",
      "challenges",
    ]);

    return questions.map((q, index) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length === 0) {
        throw new AIError(`Question ${index + 1} is missing required fields`, "INVALID_FORMAT", { question: q });
      }

      const options = [...q.options];
      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
      }
      if (options.length > 4) {
        options.length = 4;
      }

      const category = validCategories.has(q.category) ? q.category : "preferences";

      const correctAnswer = typeof q.correctAnswer === "number" ? Math.min(Math.max(0, q.correctAnswer), 3) : 0;

      const weight = typeof q.weight === "number" ? Math.min(Math.max(1, q.weight), 5) : 1;

      return {
        id: q.id || `q_${Date.now()}_${index}`,
        question: q.question.trim(),
        options: options.map((opt) => String(opt).trim()),
        correctAnswer,
        category,
        weight,
      };
    });
  }

  private getPreferredLearningStyle(styles: { visual: number; auditory: number; reading: number; kinesthetic: number }): string {
    const entries = Object.entries(styles);
    entries.sort((a, b) => b[1] - a[1]);
    const [topStyle] = entries[0];
    return topStyle;
  }

  private formatPreferences(prefs: any): string {
    return Object.entries(prefs)
      .filter(([_, value]) => value === true)
      .map(([key]) => key.replace(/([A-Z])/g, ' $1').toLowerCase())
      .join(", ");
  }

  private getPreferredContentTypes(prefs: any): string {
    const contentMap: Record<string, string> = {
      practicalProjects: "hands-on projects",
      groupWork: "collaborative activities",
      readingMaterials: "comprehensive reading materials",
      videoContent: "video tutorials",
      interactiveExercises: "interactive exercises",
    };

    return Object.entries(prefs)
      .filter(([_, value]) => value === true)
      .map(([key]) => contentMap[key] || key)
      .join(", ");
  }

  private adjustModuleDuration(duration: number, pace: "relaxed" | "standard" | "intensive"): number {
    const paceFactors = {
      relaxed: 1.2,
      standard: 1,
      intensive: 0.8,
    };
    return Math.round(duration * paceFactors[pace]);
  }

  private calculateTotalDays(duration: string): number {
    const durationMap: { [key: string]: number } = {
      "2-weeks": 14,
      "4-weeks": 28,
      "8-weeks": 56,
      "12-weeks": 84,
    };
    return durationMap[duration] || 28;
  }

  private createLearningProfile(assessment: UserAssessment): string {
    return `
Learning Profile:
- Learning Style: ${this.getPreferredLearningStyle(assessment.learningStyle)}
- Time Commitment: ${assessment.timeCommitment.hoursPerWeek} hours per week
- Preferred Time: ${assessment.timeCommitment.preferredTimeOfDay}
- Prior Knowledge: ${assessment.priorKnowledge.level}
- Preferences: ${this.formatPreferences(assessment.preferences)}
- Challenges: ${assessment.challenges.join(", ")}
- Recommended Pace: ${assessment.recommendedPace}
    `;
  }

  public async generateCourseOutline(
    topic: string,
    difficulty: "beginner" | "intermediate" | "advanced",
    duration: "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks",
    seed?: string,
  ): Promise<AIResponse<Course>> {
    try {
      console.log("Generating course outline...");
      console.log("Parameters:", { topic, difficulty, duration, seed });

      const template = `{
  "title": "Precise, engaging course title that accurately reflects the topic and difficulty level",
  "description": "Comprehensive course description explaining what students will learn, why it matters, and how it will benefit them",
  "prerequisites": ["Specific prerequisite knowledge or skills needed", "Another prerequisite"],
  "learningGoals": ["Measurable learning outcome 1", "Measurable learning outcome 2"],
  "modules": [
    {
      "title": "Clear module title reflecting content",
      "description": "Detailed explanation of module content, learning progression, and relevance"
    }
  ],
  "assessment": {
    "type": "Assessment methodology",
    "description": "Explanation of how learning will be assessed",
    "methods": ["Specific assessment method 1", "Specific assessment method 2"]
  }
}`;

      const result = await this.generateWithAI(
        `Design a comprehensive ${duration} ${difficulty} level curriculum on ${topic}. 
        
Focus on practical applications and real-world relevance. Structure content in a logical learning progression with each module building upon previous knowledge. 
        
For a ${difficulty} learner, include appropriate prerequisites, clear learning goals, and assessment methods that measure actual skill acquisition. Design ${difficulty}-appropriate modules that create a coherent learning journey.

Include 5-8 focused modules that cover the topic thoroughly but do not overlap. Each module should have a clear purpose and contribute to the overall learning goals.

Make sure learning goals are specific, measurable, and achievable within the timeframe. Prerequisites should be realistic for the ${difficulty} level.`,
        template,
        seed,
      );

      if (!result?.data) {
        throw new AIError("No data in AI response", "NO_DATA");
      }

      const validatedData = this.validateCourseResponse(result.data);

      console.log("Validated course data:", validatedData);

      const durationMap: { [key: string]: number } = {
        "2-weeks": 14,
        "4-weeks": 28,
        "8-weeks": 56,
        "12-weeks": 84,
      };

      const totalDays = durationMap[duration];
      const moduleDuration = Math.floor(totalDays / Math.max(1, (validatedData.modules?.length || 1)));

      if (!validatedData.modules || validatedData.modules.length === 0) {
        console.log("No modules found in validated data, creating a default module");
        validatedData.modules = [{
          title: `Introduction to ${topic}`,
          description: `Get started with the fundamentals of ${topic}`,
          duration: moduleDuration,
          order: 0
        }];
      }

      const course: Course = {
        id: `course_${Date.now()}`,
        title: validatedData.title || `${topic} - ${difficulty} Level Course`,
        description: validatedData.description || `A ${duration} course on ${topic} for ${difficulty} level students.`,
        prerequisites: Array.isArray(validatedData.prerequisites) ? validatedData.prerequisites : [],
        learningGoals: Array.isArray(validatedData.learningGoals) ? validatedData.learningGoals : [],
        modules: (validatedData.modules || []).map((module: any, index: number) => ({
          id: `module_${Date.now()}_${index}`,
          name: (module.title || module.name || `Module ${index + 1}`).replace(/^Module \d+[:\s-]+\s*/, ""),
          description: module.description || "",
          order: index,
          duration: module.duration || moduleDuration,
          lessons: module.lessons || [],
          completed: false,
          progress: 0,
        })),
        assessment: Array.isArray(validatedData.assessment)
          ? validatedData.assessment
          : [
              typeof validatedData.assessment === "object"
                ? validatedData.assessment.description
                : String(validatedData.assessment),
            ],
        difficulty,
        duration,
        totalDays,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user_id: "", // This will be filled in by the service consuming this API
      };

      console.log("Course generated successfully with modules:", course.modules.length);

      return {
        success: true,
        data: course,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error("Course generation failed:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate course",
        metadata: {
          attempts: 0,
          duration: 0,
          model: this.DEFAULT_MODEL,
          promptTokens: 0,
          completionTokens: 0,
        },
      };
    }
  }

  public async generateModuleLessons(
    moduleTitle: string,
    moduleDescription: string,
    courseDifficulty: string,
    courseDuration: string,
    seed?: string,
    courseContext?: {
      courseTitle: string;
      learningGoals: string[];
      prerequisites: string[];
    }
  ): Promise<AIResponse<Lesson[]>> {
    try {
      console.log("Generating module lessons...");
      console.log("Parameters:", { moduleTitle, moduleDescription, courseDifficulty, courseDuration, seed, courseContext });
      
      const template = `{
  "lessons": [
    {
      "title": "Clear, descriptive lesson title",
      "content": "Comprehensive lesson content including key concepts, explanation, and relevance",
      "duration": 1,
      "exercises": [
        {
          "title": "Exercise title reflecting the skill being practiced",
          "description": "Clear instructions with examples of expected outcome",
          "type": "practice"
        }
      ],
      "resources": [
        {
          "title": "Resource name with clear indication of content",
          "type": "article",
          "url": "https://example.com"
        }
      ]
    }
  ]
}`;

      const courseLearningGoals = courseContext?.learningGoals ? 
        `The overall course learning goals are: ${courseContext.learningGoals.join(", ")}` : "";
      
      const coursePrereqs = courseContext?.prerequisites ? 
        `The course prerequisites are: ${courseContext.prerequisites.join(", ")}` : "";
        
      const courseTitle = courseContext?.courseTitle ?
        `for the course "${courseContext.courseTitle}"` : "";

      const result = await this.generateWithAI(
        `Design detailed, pedagogically sound lessons for a module titled "${moduleTitle}" ${courseTitle} with description: "${moduleDescription}".
         
The course difficulty level is ${courseDifficulty} and duration is ${courseDuration}.
${courseLearningGoals}
${coursePrereqs}

For each lesson:
1. Create a clear title that communicates the specific topic
2. Provide comprehensive lesson content covering key concepts
3. Include 2-3 practical exercises that reinforce learning through application
4. Add 2-3 relevant resources (articles, videos, etc.) for further exploration
5. Ensure appropriate duration based on complexity
6. Design a logical learning progression across lessons where each builds on previous knowledge

Make the content accessible for ${courseDifficulty} level learners while ensuring sufficient depth and practical application. Include real-world examples and scenarios whenever possible.

The total number of lessons should be appropriate for the module scope - typically 3-5 lessons that thoroughly cover the module topic without overwhelming the learner.`,
        template,
        seed,
      );

      const validatedData = this.validateLessonResponse(result.data);

      const lessons: Lesson[] = validatedData.lessons.map((lesson, index) => ({
        id: `lesson_${Date.now()}_${index}`,
        title: lesson.title,
        content: lesson.content,
        order: index,
        duration: lesson.duration || 1,
        exercises: (lesson.exercises || []).map(exercise => ({
          id: `exercise_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          title: exercise.title,
          description: exercise.description,
          type: exercise.type,
          completed: false
        })),
        resources: (lesson.resources || []).map(resource => ({
          id: `resource_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          title: resource.title,
          type: resource.type,
          url: resource.url
        })),
        sessions: [],
        completed: false,
        progress: 0
      }));

      return {
        success: true,
        data: lessons,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error("Lesson generation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate lessons",
        metadata: {
          attempts: 0,
          duration: 0,
          model: this.DEFAULT_MODEL,
          promptTokens: 0,
          completionTokens: 0,
        },
      };
    }
  }

  public async generateLessonSessions(
    lessonTitle: string,
    lessonContent: string,
    courseDifficulty: string,
    lessonDuration: number,
    moduleContext: string,
    seed?: string,
  ): Promise<AIResponse<Session[]>> {
    try {
      console.log("Generating lesson sessions...");
      console.log("Parameters:", { lessonTitle, lessonContent, courseDifficulty, lessonDuration, moduleContext, seed });

      const template = `[
  {
    "day": 1,
    "title": "Descriptive session title reflecting specific focus",
    "duration": "1 hour",
    "objectives": ["Specific, measurable learning objective 1", "Specific, measurable learning objective 2"],
    "activities": ["Detailed activity description with clear instructions", "Another activity with purpose explained"],
    "materials": ["Specific material with purpose explained", "Another required resource"],
    "homework": "Clear instructions for meaningful practice activity",
    "notes": "Additional context or tips for implementation"
  }
]`;

      const result = await this.generateWithAI(
        `Design ${lessonDuration} daily learning sessions for the lesson "${lessonTitle}" with content: "${lessonContent}".
This is part of a ${courseDifficulty} level module about "${moduleContext}".

For each session:
1. Create clear, measurable learning objectives
2. Design active learning activities that promote engagement and application
3. Include specific materials needed
4. Provide meaningful homework to reinforce concepts
5. Add implementation notes where helpful
6. Ensure appropriate duration and pacing

The sessions should follow a logical learning progression, with each building on previous knowledge. Activities should be varied, practical, and appropriate for ${courseDifficulty} level learners.`,
        template,
        seed,
      );

      if (!result?.data) {
        throw new AIError("No data in AI response", "NO_DATA");
      }

      const sessions: Session[] = (Array.isArray(result.data) ? result.data : [result.data]).map(
        (session: any, index: number) => ({
          id: `session_${Date.now()}_${index}`,
          day: session.day || index + 1,
          title: session.title || `Day ${index + 1} Session`,
          duration: session.duration || "1 hour",
          objectives: Array.isArray(session.objectives) ? session.objectives : [session.objectives].filter(Boolean),
          activities: Array.isArray(session.activities) ? session.activities : [session.activities].filter(Boolean),
          materials: Array.isArray(session.materials) ? session.materials : [session.materials].filter(Boolean),
          homework: session.homework || undefined,
          notes: session.notes || undefined,
          completed: false,
        }),
      );

      if (sessions.length === 0) {
        throw new AIError("No valid sessions generated", "EMPTY_SESSIONS");
      }

      console.log("Sessions generated successfully:", sessions.length);

      return {
        success: true,
        data: sessions,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error("Session generation failed:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate sessions",
        metadata: {
          attempts: 0,
          duration: 0,
          model: this.DEFAULT_MODEL,
          promptTokens: 0,
          completionTokens: 0,
        },
      };
    }
  }

  public async generateAssessmentQuestions(topic: string, seed?: string): Promise<AIResponse<MCQuestion[]>> {
    try {
      console.log("Generating assessment questions for:", topic);

      if (!topic.trim()) {
        throw new AIError("Topic is required", "VALIDATION_ERROR");
      }

      const template = `[
  {
    "id": "unique_id_string",
    "question": "Clear, unambiguous question about learning preferences or style",
    "options": ["Distinct, non-overlapping option 1", "Distinct option 2", "Distinct option 3", "Distinct option 4"],
    "correctAnswer": 0,
    "category": "learning_style",
    "weight": 1
  }
]`;

      const result = await this.generateWithAI(
        `Create insightful, conversational assessment questions to understand how to personalize a course on ${topic} to match the user's learning profile.

Design questions that uncover:
1. Preferred learning modalities (visual, auditory, reading, hands-on)
2. Available time commitment and scheduling preferences
3. Prior experience and background knowledge
4. Learning goals and motivations
5. Content format preferences (video, text, interactive exercises)
6. Potential learning challenges or barriers

Make questions casual, non-technical, and focused on learning patterns rather than technical knowledge. 
Use plain language, avoid educational jargon, and ensure all answer options are distinct and non-overlapping.`,
        template,
        seed,
      );

      if (!result?.data) {
        console.error("No data in AI response");
        throw new AIError("Failed to generate questions", "NO_DATA");
      }

      console.log("Raw AI response:", result.data);

      const questions = this.validateAndCleanMCQuestions(result.data);

      if (questions.length === 0) {
        throw new AIError("No valid questions generated", "EMPTY_QUESTIONS");
      }

      if (questions.length < 5) {
        throw new AIError("Insufficient number of questions generated", "INSUFFICIENT_QUESTIONS");
      }

      return {
        success: true,
        data: questions,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error("Question generation failed:", error);

      return {
        success: false,
        error: error instanceof AIError ? error.message : "Failed to generate questions",
        metadata: {
          attempts: 0,
          duration: 0,
          model: this.DEFAULT_MODEL,
          promptTokens: 0,
          completionTokens: 0,
        },
      };
    }
  }

  public async generateCourseFromAssessment(
    topic: string,
    assessment: UserAssessment,
    duration: "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks",
    seed?: string,
  ): Promise<AIResponse<Course>> {
    try {
      console.log("Generating course from assessment...");
      console.log("Assessment:", assessment);

      const learningProfile = this.createLearningProfile(assessment);
      const totalDays = this.calculateTotalDays(duration);

      const template = `{
  "title": "Precise, engaging course title that accurately reflects the topic and difficulty level",
  "description": "Comprehensive course description explaining what students will learn, why it matters, and how it will benefit them",
  "prerequisites": ["Specific prerequisite knowledge or skills needed", "Another prerequisite"],
  "learningGoals": ["Measurable learning outcome 1", "Measurable learning outcome 2"],
  "modules": [
    {
      "title": "Clear module title reflecting content",
      "description": "Detailed explanation of module content, learning progression, and relevance"
    }
  ],
  "assessment": {
    "type": "Assessment methodology",
    "description": "Explanation of how learning will be assessed",
    "methods": ["Specific assessment method 1", "Specific assessment method 2"]
  }
}`;

      const result = await this.generateWithAI(
        `Design a personalized ${duration} curriculum on ${topic} specifically tailored to the following learning profile:
        
${learningProfile}

Key customization requirements:
- Preferred learning style is primarily ${this.getPreferredLearningStyle(assessment.learningStyle)}
- Available time commitment is ${assessment.timeCommitment.hoursPerWeek} hours per week
- Prior knowledge level is ${assessment.priorKnowledge.level}
- Content should incorporate ${this.getPreferredContentTypes(assessment.preferences)}
- Learning pace should be ${assessment.recommendedPace}
- Address challenges: ${assessment.challenges.join(", ")}

Create a comprehensive course with these specific adaptations:
1. Match content delivery to the preferred learning style
2. Structure modules to fit the available time commitment
3. Adjust complexity based on prior knowledge level
4. Include the preferred content types
5. Pace the learning according to the recommendation
6. Provide strategies to overcome the identified challenges

The course should have clear learning goals, appropriate prerequisites, and assessment methods that align with the learning style.`,
        template,
        seed,
      );

      if (!result?.data) {
        throw new AIError("No data in AI response", "NO_DATA");
      }

      const moduleDuration = Math.floor(totalDays / (result.data.modules?.length || 1));
      const adjustedModuleDuration = this.adjustModuleDuration(moduleDuration, assessment.recommendedPace);

      const course: Course = {
        id: `course_${Date.now()}`,
        title: result.data.title || `${topic} - ${assessment.priorKnowledge.level} Level Course`,
        description: result.data.description || `A ${duration} course on ${topic} for ${assessment.priorKnowledge.level} level students.`,
        prerequisites: Array.isArray(result.data.prerequisites) ? result.data.prerequisites : [],
        learningGoals: Array.isArray(result.data.learningGoals) ? result.data.learningGoals : [],
        modules: (result.data.modules || []).map((module: any, index: number) => ({
          id: `module_${Date.now()}_${index}`,
          name: (module.title || module.name || `Module ${index + 1}`).replace(/^Module \d+[:\s-]+\s*/, ""),
          description: module.description || "",
          order: index,
          duration: module.duration || adjustedModuleDuration,
          lessons: module.lessons || [],
          completed: false,
          progress: 0,
        })),
        assessment: Array.isArray(result.data.assessment)
          ? result.data.assessment
          : [
              typeof result.data.assessment === "object"
                ? result.data.assessment.description
                : String(result.data.assessment),
            ],
        difficulty: assessment.priorKnowledge.level,
        duration,
        totalDays,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user_id: "", // This will be filled in by the service consuming this API
      };

      console.log("Course generated successfully from assessment");

      return {
        success: true,
        data: course,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error("Course from assessment generation failed:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate course from assessment",
        metadata: {
          attempts: 0,
          duration: 0,
          model: this.DEFAULT_MODEL,
          promptTokens: 0,
          completionTokens: 0,
        },
      };
    }
  }

  public async generateSessionContent(
    sessionTitle: string, 
    sessionDuration: string,
    sessionObjectives: string[],
    lessonContext: string,
    moduleContext: string,
    difficulty: string,
    learningStyle?: string,
    seed?: string,
  ): Promise<AIResponse<SessionSection[]>> {
    try {
      console.log("Generating session content...");
      console.log("Parameters:", { sessionTitle, sessionDuration, sessionObjectives, lessonContext, moduleContext, difficulty, learningStyle, seed });

      const template = `[
  {
    "id": "uniqueId",
    "title": "Clear, descriptive section title",
    "duration": "15 minutes",
    "type": "reading",
    "content": "Comprehensive, structured content with clear explanations and examples",
    "resources": [
      { "title": "Descriptive resource title", "url": "https://example.com" }
    ],
    "questions": [
      { "question": "Thought-provoking discussion question", "answer": "Model answer to guide discussion" }
    ]
  }
]`;

      const stylePrompt = learningStyle 
        ? `Optimize content for a ${learningStyle} learning style. Include more ${
            learningStyle === "visual" ? "diagrams, charts, and visual examples" :
            learningStyle === "auditory" ? "discussions, verbal explanations, and audio resources" :
            learningStyle === "reading" ? "detailed text explanations, articles, and written exercises" :
            "hands-on activities, practical exercises, and experiential learning"
          }.`
        : "Balance content across different learning modalities, with slight emphasis on practical application.";

      const result = await this.generateWithAI(
        `Create detailed, pedagogically sound content for a learning session titled "${sessionTitle}" with duration ${sessionDuration}.

Session Context:
- Part of a lesson about: "${lessonContext}"
- Within a module about: "${moduleContext}"
- Difficulty level: ${difficulty}
- Learning objectives: ${sessionObjectives.join(", ")}

${stylePrompt}

Design a sequence of learning sections that:
1. Progress logically to build understanding
2. Include a variety of content types (readings, exercises, videos, etc.)
3. Provide concrete examples and applications
4. Include appropriate resources for further exploration
5. Offer opportunities for knowledge validation through questions
6. Maintain appropriate pacing for the ${difficulty} level

Each section should have appropriate duration, clear purpose, and contribute to achieving the session's learning objectives.`,
        template,
        seed,
      );

      if (!result?.data) {
        throw new AIError("No data in AI response", "NO_DATA");
      }

      const sections: SessionSection[] = (Array.isArray(result.data) ? result.data : [result.data]).map(
        (section: any, index: number) => ({
          id: section.id || `section_${Date.now()}_${index}`,
          title: section.title || `Section ${index + 1}`,
          duration: section.duration || "15 minutes",
          type: this.validateSectionType(section.type) || "reading",
          content: section.content || "",
          resources: Array.isArray(section.resources) ? section.resources : [],
          questions: Array.isArray(section.questions) ? section.questions : [],
        }),
      );

      if (sections.length === 0) {
        throw new AIError("No valid session sections generated", "EMPTY_SECTIONS");
      }

      console.log("Session content generated successfully:", sections.length);

      return {
        success: true,
        data: sections,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error("Session content generation failed:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate session content",
        metadata: {
          attempts: 0,
          duration: 0,
          model: this.DEFAULT_MODEL,
          promptTokens: 0,
          completionTokens: 0,
        },
      };
    }
  }

  private validateSectionType(type: string): SessionSection["type"] | null {
    const validTypes: SessionSection["type"][] = [
      "reading",
      "exercise",
      "quiz",
      "discussion",
      "case_study",
      "practice",
      "video",
      "reflection",
    ];
    return validTypes.includes(type as SessionSection["type"]) ? (type as SessionSection["type"]) : null;
  }
}

