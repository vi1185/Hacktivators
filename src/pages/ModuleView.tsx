import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BookOpen, Clock, Lightbulb, Image, 
  RefreshCw, Download, Share2, Maximize2, 
  Network, GitBranch, Timer, PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Header from '@/components/Header';
import LessonCard from '@/components/LessonCard';
import LoadingIndicator from '@/components/LoadingIndicator';
import { useCourseContext } from '@/context/CourseContext';
import { usePersonaContext } from '@/context/PersonaContext';
import autogenService, { VisualResponse } from '@/services/autogen-service';
import VisualRenderer from '@/components/VisualRenderer';
import type { Course, Module, Lesson, Session, Exercise, Resource } from '@/types/course';

interface VisualState {
  data: VisualResponse | null;
  isGenerating: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const ModuleView = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const navigate = useNavigate();
  const { 
    courses, 
    currentCourse, 
    setCurrentCourse,
    currentModule, 
    setCurrentModule,
    setCurrentLesson,
    updateModuleLessons
  } = useCourseContext();
  const { currentPersona } = usePersonaContext();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('content');
  const [mindMapImage, setMindMapImage] = useState<VisualResponse | null>(null);
  const [timelineImage, setTimelineImage] = useState<VisualResponse | null>(null);
  const [conceptMapImage, setConceptMapImage] = useState<VisualResponse | null>(null);
  const [infographicImage, setInfographicImage] = useState<VisualResponse | null>(null);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false);
  const [isGeneratingConceptMap, setIsGeneratingConceptMap] = useState(false);
  const [isGeneratingInfographic, setIsGeneratingInfographic] = useState(false);
  
  // Find and set the current course and module
  useEffect(() => {
    if (courseId && moduleId) {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        setCurrentCourse(course);
        const module = course.modules.find(m => m.id === moduleId);
        if (module) {
          setCurrentModule(module);
        } else {
          navigate(`/course/${courseId}`);
        }
      } else {
        navigate('/courses');
      }
    }
    
    return () => {
      setCurrentModule(null);
      setCurrentLesson(null);
    };
  }, [courseId, moduleId, courses, setCurrentCourse, setCurrentModule, setCurrentLesson, navigate]);
  
  // Calculate module progress
  useEffect(() => {
    if (currentModule) {
      const completedLessons = currentModule.lessons.filter(l => l.completed).length;
      const totalLessons = Math.max(1, currentModule.lessons.length);
      setProgress(Math.floor((completedLessons / totalLessons) * 100));
    }
  }, [currentModule]);
  
  // Add automatic lesson generation when module is loaded with no lessons
  useEffect(() => {
    if (currentModule && currentCourse && currentModule.lessons.length === 0 && !isGenerating) {
      toast.info("Generating lessons for this module...");
      generateLessons();
    }
  }, [currentModule, currentCourse]);
  
  const generateLessons = async () => {
    if (!currentCourse || !currentModule) return;
    
    setIsGenerating(true);
    
    try {
      console.log('Generating lessons with params:', {
        courseId: currentCourse.id,
        moduleId: currentModule.id,
        topic: currentCourse.title,
        moduleName: currentModule.name,
        moduleDescription: currentModule.description,
        difficulty: currentCourse.difficulty,
        usePersona: !!currentPersona
      });
      
      // If we have a persona, include it in the request
      const contextInfo = currentPersona ? 
        { personaContext: { personaId: currentPersona.id } } : undefined;
      
      const response = await autogenService.generateModuleLessons(
        currentCourse.id,
        currentModule.id,
        currentCourse.title,
        currentModule.name,
        currentModule.description,
        currentCourse.difficulty,
        {}, // Learning style - can be empty or derived from persona
        contextInfo
      );
      
      if (response.success && response.data) {
        // Add required properties to each lesson
        const lessonsWithRequiredProps: Lesson[] = response.data.lessons.map((lesson, index) => ({
          id: lesson.id || `lesson_${currentModule.id}_${index}`,
          title: lesson.title || `Lesson ${index + 1}`,
          content: lesson.content || '',
          order: lesson.order || index,
          duration: lesson.duration || 0,
          exercises: lesson.exercises ? lesson.exercises.map((exercise, index) => ({
            id: `exercise_${index}`,
            title: typeof exercise === 'string' ? exercise : 'Exercise',
            description: typeof exercise === 'string' ? exercise : 'Complete this exercise',
            type: 'practice',
            completed: false
          })) : [],
          resources: lesson.resources || [],
          sessions: [],
          completed: false,
          progress: 0
        }));
        
        updateModuleLessons(currentCourse.id, currentModule.id, lessonsWithRequiredProps);
        
        const personaMsg = currentPersona ? ` using ${currentPersona.name}'s teaching style` : '';
        // Show success toast
        toast.success(`${lessonsWithRequiredProps.length} lessons generated successfully${personaMsg}`, {
          description: "Your module content is ready to explore"
        });
      }
    } catch (error) {
      console.error("Failed to generate lessons:", error);
      
      // Extract detailed error message
      let errorMessage = "Failed to generate lessons. Please try again.";
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        if (errorObj.error && errorObj.error.message) {
          errorMessage = errorObj.error.message;
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      }
      
      toast.error(errorMessage, {
        description: "There was a problem connecting to the AI service."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMindMap = async () => {
    if (!currentModule || isGeneratingMindMap) return;
    
    setIsGeneratingMindMap(true);
    try {
      const concepts = currentModule.lessons.map(lesson => lesson.title);
      const response = await autogenService.generateMindMap(currentModule.name, concepts);
      if (response.success && response.data) {
        setMindMapImage(response.data);
        toast.success('Mind map generated successfully!');
      }
    } catch (error) {
      console.error("Failed to generate mind map:", error);
      toast.error('Failed to generate mind map');
    } finally {
      setIsGeneratingMindMap(false);
    }
  };

  const generateTimeline = async () => {
    if (!currentModule || isGeneratingTimeline) return;
    
    setIsGeneratingTimeline(true);
    try {
      const events = currentModule.lessons.map((lesson, index) => ({
        title: lesson.title,
        description: lesson.content || '',
        date: `Day ${index + 1}`
      }));
      
      const response = await autogenService.generateTimeline(events);
      if (response.success && response.data) {
        setTimelineImage(response.data);
        toast.success('Timeline generated successfully!');
      }
    } catch (error) {
      console.error("Failed to generate timeline:", error);
      toast.error('Failed to generate timeline');
    } finally {
      setIsGeneratingTimeline(false);
    }
  };

  const generateConceptMap = async () => {
    if (!currentModule || isGeneratingConceptMap) return;
    
    setIsGeneratingConceptMap(true);
    try {
      const concepts = currentModule.lessons.flatMap((lesson, i, arr) => {
        if (i === arr.length - 1) return [];
        return [{
          from: lesson.title,
          to: arr[i + 1].title,
          relationship: "leads to"
        }];
      });
      
      const response = await autogenService.generateConceptMap(concepts);
      if (response.success && response.data) {
        setConceptMapImage(response.data);
        toast.success('Concept map generated successfully!');
      }
    } catch (error) {
      console.error("Failed to generate concept map:", error);
      toast.error('Failed to generate concept map');
    } finally {
      setIsGeneratingConceptMap(false);
    }
  };

  const generateInfographic = async () => {
    if (!currentModule || isGeneratingInfographic) return;
    
    setIsGeneratingInfographic(true);
    try {
      const data = {
        title: currentModule.name,
        description: currentModule.description,
        lessons: currentModule.lessons.map(lesson => ({
          title: lesson.title,
          content: lesson.content
        }))
      };
      
      const response = await autogenService.generateInfographic(currentModule.name, data);
      if (response.success && response.data) {
        setInfographicImage(response.data);
        toast.success('Infographic generated successfully!');
      }
    } catch (error) {
      console.error("Failed to generate infographic:", error);
      toast.error('Failed to generate infographic');
    } finally {
      setIsGeneratingInfographic(false);
    }
  };

  if (!currentCourse || !currentModule) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-medium mb-4">Module Not Found</h2>
            <p className="text-muted-foreground mb-6">The module you're looking for doesn't exist or has been deleted.</p>
            <Link to="/courses">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Courses
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }
  
  const hasLessons = currentModule.lessons && currentModule.lessons.length > 0;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        title={currentModule.name}
        subtitle={`Module from ${currentCourse.title}`}
        backLink={`/course/${currentCourse.id}`}
        backLabel="Back to Course"
        viewType="module"
      />
      
      <main className="flex-grow py-10">
        <div className="container-wide">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="content">Module Content</TabsTrigger>
              <TabsTrigger value="visuals">Visual Aids</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6">
              {/* Module Overview */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <Card className="md:col-span-2 bg-card/95 backdrop-blur-sm border-border/50">
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Module Description</h3>
                        <p className="text-muted-foreground">
                          {currentModule.description}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-2">Progress</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Completion</span>
                            <span className="text-sm text-muted-foreground">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-4">Module Details</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="bg-primary/10 p-2 rounded-md mr-3">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Duration</h4>
                          <p className="text-muted-foreground">{currentModule.duration} days</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="bg-primary/10 p-2 rounded-md mr-3">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Lessons</h4>
                          <p className="text-muted-foreground">
                            {hasLessons ? currentModule.lessons.length : 'No'} lesson{hasLessons && currentModule.lessons.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-6" />
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Course Context</h4>
                      <div className="text-sm text-muted-foreground">
                        <p>Part of: <span className="font-medium text-foreground">{currentCourse.title}</span></p>
                        <p className="mt-1">Difficulty: <Badge variant="outline" className="ml-1">{currentCourse.difficulty}</Badge></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Lessons Section */}
              <div className="mb-12">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Module Lessons</h2>
                  
                  {!hasLessons && !isGenerating && (
                    <Button onClick={generateLessons}>
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Generate Lessons
                    </Button>
                  )}
                </div>
                
                {isGenerating ? (
                  <Card className="p-12 flex items-center justify-center bg-card/95 backdrop-blur-sm border-border/50">
                    <LoadingIndicator label="Generating lessons with AI..." />
                  </Card>
                ) : hasLessons ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {currentModule.lessons.map((lesson, index) => (
                      <LessonCard 
                        key={lesson.id} 
                        lesson={lesson} 
                        moduleId={currentModule.id} 
                        courseId={currentCourse.id} 
                        index={index} 
                        onClick={() => setCurrentLesson(lesson)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 bg-card/95 backdrop-blur-sm border-border/50">
                    <div className="text-center">
                      <h3 className="text-xl font-medium mb-3">No Lessons Yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        This module doesn't have any lessons yet. Generate lessons using AI or create them manually.
                      </p>
                      <Button onClick={generateLessons}>
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Generate Lessons with AI
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="visuals" className="mt-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">Visual Learning Aids</h2>
                <p className="text-muted-foreground">
                  Different visualization types to help understand the module content and structure.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Mind Map</CardTitle>
                      {!mindMapImage && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={generateMindMap}
                          disabled={isGeneratingMindMap}
                        >
                          {isGeneratingMindMap ? 'Generating...' : 'Generate'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {mindMapImage ? (
                      <VisualRenderer 
                        type={mindMapImage.type}
                        code={mindMapImage.code}
                        style={mindMapImage.style}
                        className="w-full"
                      />
                    ) : (
                      <div className="h-48 flex items-center justify-center border rounded-lg border-dashed">
                        <p className="text-muted-foreground text-sm">Generate a mind map to visualize concept relationships</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Timeline</CardTitle>
                      {!timelineImage && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={generateTimeline}
                          disabled={isGeneratingTimeline}
                        >
                          {isGeneratingTimeline ? 'Generating...' : 'Generate'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {timelineImage ? (
                      <VisualRenderer 
                        type={timelineImage.type}
                        code={timelineImage.code}
                        style={timelineImage.style}
                        className="w-full"
                      />
                    ) : (
                      <div className="h-48 flex items-center justify-center border rounded-lg border-dashed">
                        <p className="text-muted-foreground text-sm">Generate a timeline to visualize lesson progression</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Concept Map</CardTitle>
                      {!conceptMapImage && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={generateConceptMap}
                          disabled={isGeneratingConceptMap}
                        >
                          {isGeneratingConceptMap ? 'Generating...' : 'Generate'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {conceptMapImage ? (
                      <VisualRenderer 
                        type={conceptMapImage.type}
                        code={conceptMapImage.code}
                        style={conceptMapImage.style}
                        className="w-full"
                      />
                    ) : (
                      <div className="h-48 flex items-center justify-center border rounded-lg border-dashed">
                        <p className="text-muted-foreground text-sm">Generate a concept map to visualize relationships</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Infographic</CardTitle>
                      {!infographicImage && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={generateInfographic}
                          disabled={isGeneratingInfographic}
                        >
                          {isGeneratingInfographic ? 'Generating...' : 'Generate'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {infographicImage ? (
                      <VisualRenderer 
                        type={infographicImage.type}
                        code={infographicImage.code}
                        style={infographicImage.style}
                        className="w-full"
                      />
                    ) : (
                      <div className="h-48 flex items-center justify-center border rounded-lg border-dashed">
                        <p className="text-muted-foreground text-sm">Generate an infographic to summarize module content</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ModuleView;
