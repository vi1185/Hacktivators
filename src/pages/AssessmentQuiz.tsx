import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import LoadingIndicator from '@/components/LoadingIndicator';
import type { UserAssessment } from '@/types/course';
import autogenService, { MCQuestion } from '@/services/autogen-service';
import { useCourseContext } from '@/context/CourseContext';

const AssessmentQuiz = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { topic, difficulty, duration } = location.state || {};
  
  const [questions, setQuestions] = useState<MCQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  
  const { addCourse } = useCourseContext();
  
  useEffect(() => {
    if (!topic) {
      navigate('/');
      return;
    }
    
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setLoadingError(null);
        
        const response = await autogenService.generateAssessment(
          topic,
          'quiz', // type
          12, // count - set to 12 to get a good range of questions
          undefined // seed (optional)
        );
        
        if (response.success && response.data && response.data.length > 0) {
          // Validate questions before setting them
          const validQuestions = response.data.filter(q => 
            q.question && q.options && q.options.length > 0
          );
          
          if (validQuestions.length > 0) {
            setQuestions(validQuestions);
          } else {
            throw new Error("Received no valid questions in the response");
          }
        } else {
          const errorMessage = response.error?.message || "Failed to generate assessment questions";
          setLoadingError(errorMessage);
          toast.error("Failed to generate assessment questions", {
            description: errorMessage
          });
        }
      } catch (error) {
        console.error("Error generating assessment questions:", error);
        const errorMessage = error instanceof Error ? error.message : "Something went wrong";
        setLoadingError(errorMessage);
        toast.error("Error generating assessment", {
          description: errorMessage
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestions();
  }, [topic, navigate]);
  
  // Retry loading if there was an error
  const retryLoading = () => {
    if (!topic) {
      navigate('/');
      return;
    }
    
    setLoading(true);
    setLoadingError(null);
    
    const fetchQuestions = async () => {
      try {
        const response = await autogenService.generateAssessment(
          topic,
          'quiz',
          12,
          undefined
        );
        
        if (response.success && response.data && response.data.length > 0) {
          setQuestions(response.data);
        } else {
          throw new Error(response.error?.message || "Failed to generate questions");
        }
      } catch (error) {
        console.error("Error retry loading assessment questions:", error);
        const errorMessage = error instanceof Error ? error.message : "Something went wrong";
        setLoadingError(errorMessage);
        toast.error("Error generating assessment", {
          description: errorMessage
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestions();
  };
  
  useEffect(() => {
    if (questions.length > 0) {
      setProgress(((currentQuestionIndex + 1) / questions.length) * 100);
    }
  }, [currentQuestionIndex, questions.length]);
  
  const handleAnswerChange = (questionId: string, answerIndex: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };
  
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  const isCurrentQuestionAnswered = () => {
    return currentQuestion && userAnswers[currentQuestion.id] !== undefined;
  };
  
  const isLastQuestion = () => {
    return currentQuestionIndex === questions.length - 1;
  };
  
  const currentQuestion = questions[currentQuestionIndex];
  
  const calculateAssessment = (): UserAssessment => {
    // Initialize assessment structure
    const assessment: UserAssessment = {
      learningStyle: {
        visual: 0,
        auditory: 0,
        reading: 0,
        kinesthetic: 0
      },
      timeCommitment: {
        hoursPerWeek: 5, // Default
        preferredTimeOfDay: "evening" // Default
      },
      priorKnowledge: {
        level: difficulty || "beginner",
        topics: []
      },
      preferences: {
        practicalProjects: false,
        groupWork: false,
        readingMaterials: false,
        videoContent: false,
        interactiveExercises: false
      },
      challenges: [],
      recommendedPace: "standard"
    };
    
    // Process all answered questions
    Object.entries(userAnswers).forEach(([questionId, answerIndex]) => {
      const question = questions.find(q => q.id === questionId);
      if (!question) return;
      
      const weight = question.weight || 1;
      
      switch(question.category) {
        case "learning_style":
          // Map to learning style based on the question and answer
          if (answerIndex === 0) assessment.learningStyle.visual += weight;
          else if (answerIndex === 1) assessment.learningStyle.auditory += weight;
          else if (answerIndex === 2) assessment.learningStyle.reading += weight;
          else if (answerIndex === 3) assessment.learningStyle.kinesthetic += weight;
          break;
          
        case "time_availability":
          // Extract time commitment information
          if (question.question.toLowerCase().includes("hours") || 
              question.question.toLowerCase().includes("time")) {
            // Map answers to hours per week based on the options
            const hoursMapping = [2, 5, 10, 15];
            assessment.timeCommitment.hoursPerWeek = hoursMapping[answerIndex] || 5;
          }
          
          if (question.question.toLowerCase().includes("prefer") || 
              question.question.toLowerCase().includes("day")) {
            // Map answers to preferred time of day
            const timeMapping = ["morning", "afternoon", "evening", "anytime"];
            assessment.timeCommitment.preferredTimeOfDay = timeMapping[answerIndex] || "evening";
          }
          break;
          
        case "prior_experience":
          // Update prior knowledge if relevant
          if (question.question.toLowerCase().includes("experience") || 
              question.question.toLowerCase().includes("familiar")) {
            const levelMapping = ["beginner", "beginner", "intermediate", "advanced"];
            assessment.priorKnowledge.level = levelMapping[answerIndex] || difficulty || "beginner";
          }
          break;
          
        case "preferences":
          // Update preferences based on the answers
          if (answerIndex === 0 || answerIndex === 3) {
            assessment.preferences.practicalProjects = true;
          }
          if (answerIndex === 1) {
            assessment.preferences.groupWork = true;
          }
          if (answerIndex === 2) {
            assessment.preferences.readingMaterials = true;
          }
          if (answerIndex === 0 || answerIndex === 2) {
            assessment.preferences.videoContent = true;
          }
          if (answerIndex === 3) {
            assessment.preferences.interactiveExercises = true;
          }
          break;
          
        case "challenges":
          // Collect learning challenges
          const challengeOptions = question.options;
          if (challengeOptions[answerIndex]) {
            assessment.challenges.push(challengeOptions[answerIndex]);
          }
          break;
          
        case "goals":
          // Goals can influence pace and focus
          if (question.question.toLowerCase().includes("pace") || 
              question.question.toLowerCase().includes("speed")) {
            const paceMapping: Array<"relaxed" | "standard" | "intensive"> = ["relaxed", "standard", "standard", "intensive"];
            assessment.recommendedPace = paceMapping[answerIndex] || "standard";
          }
          break;
      }
    });
    
    return assessment;
  };
  
  const handleSubmitAssessment = async () => {
    if (!location.state?.topic || !location.state?.duration) {
      navigate('/create');
      return;
    }

    setIsSubmitting(true);

    try {
      const assessment = calculateAssessment();
      
      // Instead of generating a course directly, redirect to the persona selection page
      // and pass along the assessment data and course parameters
      navigate('/persona', {
        state: {
          fromAssessment: true,
          topic: location.state.topic,
          difficulty: location.state.difficulty || assessment.priorKnowledge.level,
          duration: location.state.duration,
          assessment
        }
      });
    } catch (error) {
      console.error("Assessment processing failed:", error);
      toast.error("Failed to process assessment", {
        description: "Please try again later"
      });
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="Learning Assessment" subtitle="Analyzing your learning preferences" backLink="/" />
        <main className="flex-grow flex items-center justify-center">
          <LoadingIndicator size="lg" label="Preparing your personalized assessment..." />
        </main>
      </div>
    );
  }
  
  if (loadingError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="Learning Assessment" subtitle="Analyzing your learning preferences" backLink="/" />
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error Loading Assessment</CardTitle>
              <CardDescription>We encountered a problem while preparing your assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{loadingError}</p>
              <p className="text-sm">This could be due to:</p>
              <ul className="list-disc ml-5 text-sm text-muted-foreground mb-4">
                <li>Temporary server issues</li>
                <li>Network connectivity problems</li>
                <li>The AI model timing out</li>
              </ul>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/')}>
                Go Back
              </Button>
              <Button onClick={retryLoading}>
                Try Again
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }
  
  if (!questions.length) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="Learning Assessment" subtitle="Analyzing your learning preferences" backLink="/" />
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>No Questions Available</CardTitle>
              <CardDescription>We couldn't generate assessment questions for this topic</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We're having trouble creating an assessment for "{topic}". This might be due to the complexity 
                or specificity of the topic.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/')}>
                Go Back
              </Button>
              <Button onClick={retryLoading}>
                Try Again
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        title="Learning Assessment" 
        subtitle="Help us personalize your learning experience"
        backLink="/"
      />
      
      <main className="flex-grow py-8">
        <div className="container max-w-3xl">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="text-primary h-5 w-5" />
              <h2 className="text-xl font-medium">Customizing your learning journey</h2>
            </div>
            <p className="text-muted-foreground">
              Answer these questions to help us understand your learning preferences 
              and create a personalized course experience for "{topic}".
            </p>
            
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
            </div>
          </div>
          
          {currentQuestion && (
            <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
                <CardDescription>
                  Select the option that best describes your preference
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <RadioGroup 
                  value={userAnswers[currentQuestion.id]?.toString()} 
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, parseInt(value))}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-grow cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
              
              <CardFooter className="flex justify-between border-t border-border/50 pt-4">
                <Button
                  variant="outline"
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                {isLastQuestion() ? (
                  <Button 
                    onClick={handleSubmitAssessment}
                    disabled={!isCurrentQuestionAnswered() || generating}
                  >
                    {generating ? (
                      <LoadingIndicator size="sm" inline label="Creating your course..." />
                    ) : (
                      'Generate Personalized Course'
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={goToNextQuestion}
                    disabled={!isCurrentQuestionAnswered()}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Your answers will help us tailor content, pacing, and teaching methods to your unique needs</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssessmentQuiz;
