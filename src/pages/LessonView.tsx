import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, BookMarked, Lightbulb, Check, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import SessionCard from '@/components/SessionCard';
import LoadingIndicator from '@/components/LoadingIndicator';
import { useCourseContext } from '@/context/CourseContext';
import autogenService from '@/services/autogen-service';

const LessonView = () => {
  const { courseId, moduleId, lessonId } = useParams<{ courseId: string; moduleId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { 
    courses, 
    currentCourse, 
    setCurrentCourse,
    currentModule, 
    setCurrentModule,
    currentLesson,
    setCurrentLesson,
    updateLessonSessions,
    updateLesson
  } = useCourseContext();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("content");
  
  // Find and set the current course, module, and lesson
  useEffect(() => {
    if (courseId && moduleId && lessonId) {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        setCurrentCourse(course);
        const module = course.modules.find(m => m.id === moduleId);
        if (module) {
          setCurrentModule(module);
          const lesson = module.lessons.find(l => l.id === lessonId);
          if (lesson) {
            setCurrentLesson(lesson);
          } else {
            navigate(`/course/${courseId}/module/${moduleId}`);
          }
        } else {
          navigate(`/course/${courseId}`);
        }
      } else {
        navigate('/courses');
      }
    }
    
    return () => {
      setCurrentLesson(null);
    };
  }, [courseId, moduleId, lessonId, courses, setCurrentCourse, setCurrentModule, setCurrentLesson, navigate]);
  
  // Calculate lesson progress
  useEffect(() => {
    if (currentLesson) {
      const completedSessions = currentLesson.sessions.filter(s => s.completed).length;
      const totalSessions = Math.max(1, currentLesson.sessions.length);
      setProgress(Math.floor((completedSessions / totalSessions) * 100));
    }
  }, [currentLesson]);
  
  const generateSessions = async () => {
    if (!currentCourse || !currentModule || !currentLesson) return;
    
    setIsGenerating(true);
    
    try {
      const response = await autogenService.generateLessonSessions(
        currentLesson.title,
        currentLesson.content,
        currentCourse.difficulty,
        currentLesson.duration,
        currentModule.name
      );
      
      if (response.success && response.data) {
        // Map the autogen service sessions to match the course Session type
        const mappedSessions = response.data.map((session, index) => ({
          id: session.id,
          day: index + 1,
          title: session.title,
          duration: `${session.duration} minutes`,
          objectives: [session.description], // Convert description to objectives array
          activities: [], // Initialize empty activities array
          materials: [], // Initialize empty materials array
          completed: false,
          sections: session.sections.map(section => {
            const mappedType = mapSectionType(section.type);
            return {
              id: section.id,
              title: section.title,
              content: section.content,
              type: mappedType,
              duration: 0, // Initialize with default duration
              questions: [], // Initialize empty questions array
              completed: section.completed,
              order: section.order
            };
          })
        }));
        
        updateLessonSessions(
          currentCourse.id, 
          currentModule.id, 
          currentLesson.id, 
          mappedSessions
        );
      }
    } catch (error) {
      console.error("Failed to generate sessions:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Helper function to map section types
  const mapSectionType = (type: string): 'reading' | 'exercise' | 'quiz' | 'group-activity' | 'discussion' | 'code_playground' => {
    switch (type) {
      case 'text':
        return 'reading';
      case 'code':
        return 'code_playground';
      case 'practice':
        return 'exercise';
      case 'quiz':
        return 'quiz';
      case 'visual':
        return 'discussion';
      default:
        return 'reading';
    }
  };
  
  const toggleLessonCompletion = () => {
    if (!currentCourse || !currentModule || !currentLesson) return;
    
    updateLesson(
      currentCourse.id,
      currentModule.id,
      currentLesson.id,
      { completed: !currentLesson.completed }
    );
  };
  
  if (!currentCourse || !currentModule || !currentLesson) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-medium mb-4">Lesson Not Found</h2>
            <p className="text-muted-foreground mb-6">The lesson you're looking for doesn't exist or has been deleted.</p>
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
  
  const hasSessions = currentLesson.sessions && currentLesson.sessions.length > 0;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        title={currentLesson.title}
        subtitle={`Lesson from ${currentModule.name}`}
        backLink={`/course/${currentCourse.id}/module/${currentModule.id}`}
        backLabel="Back to Module"
        viewType="lesson"
      />
      
      <main className="flex-grow py-10">
        <div className="container-wide">
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
            <Button 
              variant="outline" 
              onClick={toggleLessonCompletion}
              className={currentLesson.completed ? "bg-primary/5 border-primary/20 text-primary" : ""}
            >
              {currentLesson.completed ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Completed
                </>
              ) : (
                "Mark as Completed"
              )}
            </Button>
            
            {!hasSessions && !isGenerating && (
              <Button onClick={generateSessions}>
                <Lightbulb className="mr-2 h-4 w-4" />
                Generate Daily Sessions
              </Button>
            )}
          </div>
          
          {/* Lesson Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
            <TabsList className="grid w-full sm:w-auto grid-cols-3">
              <TabsTrigger value="content">Lesson Content</TabsTrigger>
              <TabsTrigger value="exercises">Exercises</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="mt-6">
              <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                <CardContent className="pt-6">
                  <div className="prose max-w-none">
                    <div className="flex items-center gap-2 mb-4">
                      <BookMarked className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium m-0">Lesson Content</h3>
                    </div>
                    
                    <div className="mt-4 space-y-4 text-muted-foreground">
                      {currentLesson.content.split('\n\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium">Progress</h3>
                      <span className="text-sm text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="exercises" className="mt-6">
              <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl">Practical Exercises</CardTitle>
                  <CardDescription>Hands-on activities to reinforce your learning</CardDescription>
                </CardHeader>
                <CardContent>
                  {currentLesson.exercises && currentLesson.exercises.length > 0 ? (
                    <div className="space-y-6">
                      {currentLesson.exercises.map((exercise, index) => (
                        <div key={index} className="border border-border rounded-lg p-5">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                              <Badge className="mr-3">{exercise.type}</Badge>
                              <h4 className="text-lg font-medium">{exercise.title}</h4>
                            </div>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={exercise.completed ? "bg-primary/5 border-primary/20 text-primary" : ""}
                              onClick={() => {
                                const updatedExercises = [...currentLesson.exercises];
                                updatedExercises[index] = {
                                  ...exercise,
                                  completed: !exercise.completed
                                };
                                
                                updateLesson(
                                  currentCourse.id,
                                  currentModule.id,
                                  currentLesson.id,
                                  { exercises: updatedExercises }
                                );
                              }}
                            >
                              {exercise.completed ? (
                                <>
                                  <Check className="mr-1 h-3 w-3" />
                                  Completed
                                </>
                              ) : (
                                "Mark Complete"
                              )}
                            </Button>
                          </div>
                          
                          <p className="text-muted-foreground">
                            {exercise.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                      <h3 className="text-xl font-medium mb-2">No Exercises</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        This lesson doesn't have any exercises yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="resources" className="mt-6">
              <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl">Supplementary Resources</CardTitle>
                  <CardDescription>Additional materials to deepen your understanding</CardDescription>
                </CardHeader>
                <CardContent>
                  {currentLesson.resources && currentLesson.resources.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {currentLesson.resources.map((resource, index) => (
                        <Card key={index} className="overflow-hidden">
                          <CardHeader className="pb-2">
                            <Badge className="self-start mb-1">{resource.type}</Badge>
                            <CardTitle className="text-base">{resource.title}</CardTitle>
                          </CardHeader>
                          <CardFooter>
                            <a 
                              href={resource.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full"
                            >
                              <Button variant="outline" className="w-full">
                                <span className="mr-1">View Resource</span>
                                <ExternalLink size={14} />
                              </Button>
                            </a>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                      <h3 className="text-xl font-medium mb-2">No Resources</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        This lesson doesn't have any supplementary resources yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Daily Sessions Section */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Daily Learning Sessions</h2>
              
              {!hasSessions && !isGenerating && (
                <Button onClick={generateSessions}>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Generate Sessions
                </Button>
              )}
            </div>
            
            {isGenerating ? (
              <Card className="p-12 flex items-center justify-center bg-card/95 backdrop-blur-sm border-border/50">
                <LoadingIndicator label="Generating daily sessions with AI..." />
              </Card>
            ) : hasSessions ? (
              <div className="grid md:grid-cols-2 gap-6">
                {currentLesson.sessions.map((session) => (
                  <SessionCard 
                    key={session.id} 
                    session={session} 
                    lessonId={currentLesson.id}
                    moduleId={currentModule.id} 
                    courseId={currentCourse.id}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 bg-card/95 backdrop-blur-sm border-border/50">
                <div className="text-center">
                  <h3 className="text-xl font-medium mb-3">No Sessions Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    This lesson doesn't have any daily learning sessions yet. Generate sessions using AI to break down this lesson into manageable daily activities.
                  </p>
                  <Button onClick={generateSessions}>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Generate Daily Sessions with AI
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LessonView;
