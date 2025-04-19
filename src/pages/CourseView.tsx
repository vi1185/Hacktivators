import React, { useEffect, useState } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { Settings, GraduationCap, MessageCircle, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Header from '@/components/Header';
import ModuleCard from '@/components/ModuleCard';
import LoadingIndicator from '@/components/LoadingIndicator';
import CourseCalendar from '@/components/CourseCalendar';
import CourseAssistant from '@/components/CourseAssistant';
import { useCourseContext } from '@/context/CourseContext';

const CourseView = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { courses, currentCourse, setCurrentCourse } = useCourseContext();
  
  const [activeTab, setActiveTab] = useState<string>("modules");
  const [isNewCourse, setIsNewCourse] = useState(false);
  
  useEffect(() => {
    if (location.state?.newCourse) {
      setIsNewCourse(true);
      toast.success("Course generated successfully!", {
        description: "Your personalized learning journey is ready."
      });
    }
  }, [location]);
  
  useEffect(() => {
    if (courseId) {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        setCurrentCourse(course);
      } else {
        navigate('/courses');
      }
    }
    
    return () => {
      setCurrentCourse(null);
    };
  }, [courseId, courses, navigate, setCurrentCourse]);
  
  if (!currentCourse) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="Loading Course" />
        <main className="flex-grow flex items-center justify-center">
          <LoadingIndicator size="lg" label="Loading course details..." />
        </main>
      </div>
    );
  }
  
  const calculateProgress = (course) => {
    if (!course.modules || course.modules.length === 0) return 0;
    
    const totalModules = course.modules.length;
    const completedModules = course.modules.filter(module => module.completed).length;
    
    return Math.round((completedModules / totalModules) * 100);
  };
  
  const courseProgress = calculateProgress(currentCourse);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title={currentCourse.title}
        subtitle={`${currentCourse.difficulty} level · ${currentCourse.duration}`}
        backLink="/courses"
        backLabel="All Courses"
        viewType="module"
      />
      
      <main className="flex-grow py-10">
        <div className="container-wide">
          <div className="grid lg:grid-cols-3 gap-8 mb-10">
            <div className="lg:col-span-2">
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex justify-between">
                    <div>
                      <CardTitle className="text-2xl">{currentCourse.title}</CardTitle>
                      <CardDescription className="mt-2">{currentCourse.description}</CardDescription>
                    </div>
                    <Badge variant="outline" className="h-fit text-base font-medium">
                      {currentCourse.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Course Progress</span>
                        <span className="text-sm text-muted-foreground">{courseProgress}%</span>
                      </div>
                      <Progress value={courseProgress} className="h-2" />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          Learning Goals
                        </h3>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {currentCourse.learningGoals.map((goal, index) => (
                            <li key={index} className="list-disc list-inside">{goal}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {currentCourse.prerequisites && currentCourse.prerequisites.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium mb-2">Prerequisites</h3>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            {currentCourse.prerequisites.map((prerequisite, index) => (
                              <li key={index} className="list-disc list-inside">{prerequisite}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Course Overview</CardTitle>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{currentCourse.duration}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modules</span>
                      <span className="font-medium">{currentCourse.modules.length}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Days</span>
                      <span className="font-medium">{currentCourse.totalDays} days</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">
                        {new Date(currentCourse.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex-col space-y-2">
                  <Button 
                    className="w-full justify-between" 
                    variant="outline"
                    onClick={() => setActiveTab("calendar")}
                  >
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      View Calendar
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>

                  <Button 
                    className="w-full justify-between" 
                    variant="outline"
                    asChild
                  >
                    <Link to={`/course/${currentCourse.id}/settings`}>
                      <div className="flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        Course Settings
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="modules" className="mt-6">
              <div className="space-y-6">
                {currentCourse.modules.map((module, index) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    courseId={currentCourse.id}
                    index={index}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="calendar" className="mt-6">
              <CourseCalendar courseId={currentCourse.id} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {/* Course Assistant */}
      <CourseAssistant courseId={currentCourse.id} />
    </div>
  );
};

export default CourseView;
