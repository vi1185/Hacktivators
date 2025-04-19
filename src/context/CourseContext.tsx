import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Course, Module, Lesson, Session, SessionSection, UserAssessment } from '@/types/course';
import autogenService from '@/services/autogen-service';
import { toast } from 'sonner';

interface UserProgress {
  completedSessions: string[];
  quizScores: Record<string, number>;
  learningStyle: string;
  pace: 'relaxed' | 'standard' | 'intensive';
  lastAccessed: {
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
    sessionId?: string;
    timestamp: number;
  };
}

interface CourseContextType {
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  currentCourse: Course | null;
  setCurrentCourse: (course: Course | null) => void;
  currentModule: Module | null;
  setCurrentModule: (module: Module | null) => void;
  currentLesson: Lesson | null;
  setCurrentLesson: (lesson: Lesson | null) => void;
  currentSession: Session | null;
  setCurrentSession: (session: Session | null) => void;
  updateSession: (courseId: string, moduleId: string, lessonId: string, sessionId: string, updates: Partial<Session>) => void;
  updateSessionSections: (courseId: string, moduleId: string, lessonId: string, sessionId: string, sections: SessionSection[]) => void;
  userProgress: UserProgress;
  updateUserProgress: (updates: Partial<UserProgress>) => void;
  addCourse: (course: Course) => void;
  updateModuleLessons: (courseId: string, moduleId: string, lessons: Lesson[]) => void;
  updateLessonSessions: (courseId: string, moduleId: string, lessonId: string, sessions: Session[]) => void;
  updateLesson: (courseId: string, moduleId: string, lessonId: string, updates: Partial<Lesson>) => void;
  isLoading: boolean;
  error: string | null;
  generateCourse: (topic: string, difficulty: string, duration: string) => Promise<void>;
  generateFromAssessment: (topic: string, assessment: UserAssessment, duration: string) => Promise<void>;
  clearError: () => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    const savedProgress = localStorage.getItem('userProgress');
    return savedProgress ? JSON.parse(savedProgress) : {
      completedSessions: [],
      quizScores: {},
      learningStyle: 'visual',
      pace: 'standard',
      lastAccessed: {
        timestamp: Date.now()
      }
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load courses from localStorage on mount
  useEffect(() => {
    const storedCourses = localStorage.getItem('courses');
    if (storedCourses) {
      try {
        setCourses(JSON.parse(storedCourses));
      } catch (error) {
        console.error('Error parsing stored courses:', error);
      }
    }
  }, []);

  // Save courses to localStorage when they change
  useEffect(() => {
    localStorage.setItem('courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('userProgress', JSON.stringify(userProgress));
  }, [userProgress]);

  const addCourse = useCallback((course: Course) => {
    // First check if the course already exists (by ID)
    const courseExists = courses.some(c => c.id === course.id);
    
    if (!courseExists) {
      console.log(`Adding new course with ID: ${course.id}`);
      
      // Add the course to state
      const updatedCourses = [...courses, course];
      setCourses(updatedCourses);
      
      // Save to localStorage immediately
      try {
        localStorage.setItem('courses', JSON.stringify(updatedCourses));
        console.log('Saved updated courses to localStorage');
      } catch (error) {
        console.error('Error saving courses to localStorage:', error);
      }
      
      // Set as current course
      setCurrentCourse(course);
      
      console.log(`Course "${course.title}" (ID: ${course.id}) added successfully.`);
    } else {
      console.log(`Course with ID ${course.id} already exists, setting as current.`);
      // If course already exists, just set it as current course
      const existingCourse = courses.find(c => c.id === course.id);
      if (existingCourse) {
        setCurrentCourse(existingCourse);
      }
    }
  }, [courses, setCurrentCourse]);

  const updateModule = (courseId: string, moduleId: string, updatedModule: Partial<Module>) => {
    setCourses((prevCourses) => 
      prevCourses.map((course) => {
        if (course.id !== courseId) return course;
        
        return {
          ...course,
          modules: course.modules.map((module) => 
            module.id === moduleId ? { ...module, ...updatedModule } : module
          ),
        };
      })
    );
    
    // Update current module if it's the one being updated
    if (currentModule?.id === moduleId) {
      setCurrentModule((prev) => prev ? { ...prev, ...updatedModule } : null);
    }
  };

  const updateLesson = (courseId: string, moduleId: string, lessonId: string, updatedLesson: Partial<Lesson>) => {
    setCourses((prevCourses) => 
      prevCourses.map((course) => {
        if (course.id !== courseId) return course;
        
        return {
          ...course,
          modules: course.modules.map((module) => {
            if (module.id !== moduleId) return module;
            
            return {
              ...module,
              lessons: module.lessons.map((lesson) => 
                lesson.id === lessonId ? { ...lesson, ...updatedLesson } : lesson
              ),
            };
          }),
        };
      })
    );
    
    // Update current lesson if it's the one being updated
    if (currentLesson?.id === lessonId) {
      setCurrentLesson((prev) => prev ? { ...prev, ...updatedLesson } : null);
    }
  };

  const updateSession = (courseId: string, moduleId: string, lessonId: string, sessionId: string, updates: Partial<Session>) => {
    setCourses(prevCourses => {
      return prevCourses.map(course => {
        if (course.id !== courseId) return course;
        
        return {
          ...course,
          modules: course.modules.map(module => {
            if (module.id !== moduleId) return module;
            
            return {
              ...module,
              lessons: module.lessons.map(lesson => {
                if (lesson.id !== lessonId) return lesson;
                
                return {
                  ...lesson,
                  sessions: lesson.sessions.map(session => {
                    if (session.id !== sessionId) return session;
                    return { ...session, ...updates };
                  })
                };
              })
            };
          })
        };
      });
    });

    if (updates.completed !== undefined) {
      updateUserProgress({
        completedSessions: updates.completed
          ? [...userProgress.completedSessions, sessionId]
          : userProgress.completedSessions.filter(id => id !== sessionId)
      });
    }
  };
  
  const updateModuleLessons = (courseId: string, moduleId: string, lessons: Lesson[]) => {
    setCourses((prevCourses) => 
      prevCourses.map((course) => {
        if (course.id !== courseId) return course;
        
        return {
          ...course,
          modules: course.modules.map((module) => {
            if (module.id !== moduleId) return module;
            
            return {
              ...module,
              lessons: lessons,
            };
          }),
        };
      })
    );
    
    // Update current module if it's the one being updated
    if (currentModule?.id === moduleId) {
      setCurrentModule((prev) => prev ? { ...prev, lessons } : null);
    }
  };

  const updateLessonSessions = (courseId: string, moduleId: string, lessonId: string, sessions: Session[]) => {
    setCourses((prevCourses) => 
      prevCourses.map((course) => {
        if (course.id !== courseId) return course;
        
        return {
          ...course,
          modules: course.modules.map((module) => {
            if (module.id !== moduleId) return module;
            
            return {
              ...module,
              lessons: module.lessons.map((lesson) => {
                if (lesson.id !== lessonId) return lesson;
                
                return {
                  ...lesson,
                  sessions: sessions,
                };
              }),
            };
          }),
        };
      })
    );
    
    // Update current lesson if it's the one being updated
    if (currentLesson?.id === lessonId) {
      setCurrentLesson((prev) => prev ? { ...prev, sessions } : null);
    }
  };

  const updateSessionSections = (courseId: string, moduleId: string, lessonId: string, sessionId: string, sections: SessionSection[]) => {
    updateSession(courseId, moduleId, lessonId, sessionId, { sections });
  };

  const updateUserProgress = (updates: Partial<UserProgress>) => {
    setUserProgress(prev => ({
      ...prev,
      ...updates,
      lastAccessed: {
        courseId: currentCourse?.id,
        moduleId: currentModule?.id,
        lessonId: currentLesson?.id,
        sessionId: currentSession?.id,
        timestamp: Date.now()
      }
    }));
  };

  const clearError = useCallback(() => setError(null), []);

  const generateCourse = useCallback(async (
    topic: string,
    difficulty: "beginner" | "intermediate" | "advanced",
    duration: "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks"
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await autogenService.generateCourseOutline(topic, difficulty, duration);
      if (response.success && response.data) {
        setCurrentCourse(response.data);
        toast.success('Course generated successfully!');
      } else {
        throw new Error(response.error ? String(response.error) : 'Failed to generate course');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate course';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateFromAssessment = useCallback(async (
    topic: string,
    assessment: UserAssessment,
    duration: "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks"
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await autogenService.generateCourseFromAssessment(topic, assessment, duration);
      if (response.success && response.data) {
        setCurrentCourse(response.data);
        toast.success('Personalized course generated successfully!');
      } else {
        throw new Error(response.error ? String(response.error) : 'Failed to generate personalized course');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate personalized course';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: CourseContextType = {
    courses,
    setCourses,
    currentCourse,
    setCurrentCourse,
    currentModule,
    setCurrentModule,
    currentLesson,
    setCurrentLesson,
    currentSession,
    setCurrentSession,
    updateSession,
    updateSessionSections,
    userProgress,
    updateUserProgress,
    addCourse,
    updateModuleLessons,
    updateLessonSessions,
    updateLesson,
    isLoading,
    error,
    generateCourse,
    generateFromAssessment,
    clearError
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourseContext = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourseContext must be used within a CourseProvider');
  }
  return context;
};

export default CourseContext;
