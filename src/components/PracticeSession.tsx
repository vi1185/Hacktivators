import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Brain, Clock, Target, HelpCircle, CheckCircle, XCircle, Save, RotateCcw, Flame, Trophy, ChartBar, ListChecks, ArrowRight, Lightbulb } from 'lucide-react';
import { useCourseContext } from '@/context/CourseContext';
import autogenService from '@/services/autogen-service';
import type { PracticeSession, PracticeInteraction, PracticeReport } from '@/types/practice';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

// Define interface for backend response
interface PracticeExerciseResponse {
  title: string;
  description: string;
  exercises: Array<{
    id: string;
    type: string;
    question: string;
    steps: string[];
    solution: string;
  }>;
  difficulty: string;
  estimatedTime: string;
}

interface QuestionContent {
  scenario: string;
  question: string;
  options: Array<{
    text: string;
    correct: boolean;
  }>;
  feedback: {
    correct: string;
    incorrect: string;
  };
  hints: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  timeEstimate: number; // in minutes
  relatedConcepts: string[];
  visualAid?: {
    type: 'image' | 'diagram' | 'code' | 'math';
    content: string;
  };
  nextTopics?: string[];
}

function isQuestionContent(content: any): content is QuestionContent {
  return (
    typeof content === 'object' &&
    'scenario' in content &&
    'question' in content &&
    'options' in content &&
    'feedback' in content &&
    'hints' in content &&
    'difficulty' in content &&
    'tags' in content &&
    'timeEstimate' in content &&
    'relatedConcepts' in content
  );
}

interface CodeExercise {
  prompt: string;
  initialCode: string;
  testCases: Array<{
    input: string;
    expectedOutput: string;
  }>;
  hints: string[];
  solution: string;
  explanation: string;
}

interface VisualExercise {
  type: 'diagram' | 'flowchart' | 'mindmap';
  prompt: string;
  elements: any[];
  correctLayout: any;
  hints: string[];
}

interface PracticeSessionProps {
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  onComplete?: (report: PracticeReport) => void;
}

const PracticeSession: React.FC<PracticeSessionProps> = ({
  courseId,
  moduleId,
  lessonId,
  onComplete
}) => {
  const { currentCourse, currentModule, currentLesson } = useCourseContext();
  
  const [session, setSession] = useState<PracticeSession>({
    id: `practice_${Date.now()}`,
    courseId,
    moduleId,
    lessonId,
    status: 'active',
    startTime: Date.now(),
    interactions: [],
    currentTopic: currentLesson?.title || currentModule?.name || currentCourse?.title || 'General Practice'
  });

  const [currentInteraction, setCurrentInteraction] = useState<PracticeInteraction | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userResponse, setUserResponse] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [needsHelp, setNeedsHelp] = useState(false);

  // New state for additional features
  const [elapsedTime, setElapsedTime] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [sessionStats, setSessionStats] = useState({
    averageConfidence: 0,
    helpRequests: 0,
    averageResponseTime: 0
  });

  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [showNext, setShowNext] = useState(false);
  const [sessionData, setSessionData] = useState<{
    startTime: number;
    interactions: PracticeInteraction[];
  }>({
    startTime: Date.now(),
    interactions: [],
  });

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    generateNextInteraction();
  }, []);

  const generateNextInteraction = async () => {
    try {
      setIsGenerating(true);
      const topic = currentLesson?.title || currentModule?.name || currentCourse?.title;
      const difficulty = currentCourse?.difficulty || 'intermediate';
      
      const result = await autogenService.generatePracticeContent(
        topic,
        difficulty,
        session.interactions
      );

      if (result.success && result.data) {
        // Convert the new exercise format to a PracticeInteraction format
        const responseData = result.data as unknown as PracticeExerciseResponse;
        
        if (responseData.exercises && Array.isArray(responseData.exercises)) {
          // Take the first exercise and convert it to interaction format
          const exercise = responseData.exercises[0];
          const interaction: PracticeInteraction = {
            id: exercise.id || `exercise_${Date.now()}`,
            type: 'question',
            timestamp: Date.now(),
            content: {
              scenario: responseData.description || '',
              question: exercise.question || 'Unexpected content format',
              options: [
                { text: 'Continue to answer in your own words', correct: true },
              ],
              feedback: {
                correct: 'Good job! Your answer shows understanding of the concept.',
                incorrect: 'Consider reviewing the material and trying again.'
              },
              hints: exercise.steps || [],
              difficulty: responseData.difficulty as 'beginner' | 'intermediate' | 'advanced' || 'intermediate',
              tags: ['practice'],
              timeEstimate: parseInt(responseData.estimatedTime) || 5,
              relatedConcepts: []
            }
          };
          setCurrentInteraction(interaction);
        } else {
          // Fallback for unexpected format
          setCurrentInteraction({
            id: `exercise_${Date.now()}`,
            type: 'question',
            timestamp: Date.now(),
            content: {
              scenario: 'Practice Exercise',
              question: 'Unexpected content format',
              options: [
                { text: 'Continue', correct: true },
              ],
              feedback: {
                correct: 'Let\'s move on to the next exercise.',
                incorrect: 'Let\'s try again.'
              },
              hints: ['Try to answer based on what you\'ve learned so far'],
              difficulty: 'intermediate',
              tags: ['practice'],
              timeEstimate: 5,
              relatedConcepts: []
            }
          });
        }
      }
    } catch (error) {
      toast.error("Failed to generate practice content", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!currentInteraction || !userResponse) return;

    try {
      // Evaluate the response
      const isCorrect = evaluateResponse(userResponse, currentInteraction);
      const feedbackMessage = isCorrect 
        ? (currentInteraction.content as QuestionContent).feedback.correct
        : (currentInteraction.content as QuestionContent).feedback.incorrect;

      setFeedback({
        isCorrect,
        message: feedbackMessage
      });

      // Update session data
      setSessionData(prev => ({
        ...prev,
        interactions: [...prev.interactions, {
          ...currentInteraction,
          success: isCorrect,
          timestamp: Date.now()
        }]
      }));

      // Show next button
      setShowNext(true);
    } catch (error) {
      console.error('Error evaluating response:', error);
    }
  };

  const handleNextQuestion = async () => {
    setUserResponse('');
    setFeedback(null);
    setShowNext(false);
    await generateNextInteraction();
  };

  // Helper function to evaluate response
  const evaluateResponse = (response: string, interaction: PracticeInteraction) => {
    if (!isQuestionContent(interaction.content)) return false;
    const question = interaction.content;
    const correctOption = question.options.find(opt => opt.correct);
    return correctOption?.text === response;
  };

  const handleRequestHint = () => {
    setNeedsHelp(true);
    // Generate hint using AI
  };

  const handleEndSession = async () => {
    try {
      const endTime = Date.now();
      const updatedSession = {
        ...session,
        status: 'completed' as const,
        endTime
      };

      const result = await autogenService.analyzePracticeSession(updatedSession);
      
      if (result.success && result.data) {
        // Adapt course content based on the practice report
        const adaptationResult = await autogenService.adaptCourseContent(courseId, result.data);
        
        if (adaptationResult.success) {
          toast.success("Practice session completed!", {
            description: "Course content has been adapted based on your performance."
          });
        }

        onComplete?.(result.data);
      }
    } catch (error) {
      toast.error("Failed to analyze practice session", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Practice Session</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                localStorage.setItem(`practice_session_${session.id}`, JSON.stringify({
                  session,
                  stats: sessionStats,
                  streak,
                  totalQuestions,
                  correctAnswers
                }));
                toast.success("Session saved!");
              }}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={() => {
                const savedSession = localStorage.getItem(`practice_session_${session.id}`);
                if (savedSession) {
                  const { session: savedSessionData, stats, streak: savedStreak, totalQuestions: savedTotal, correctAnswers: savedCorrect } = JSON.parse(savedSession);
                  setSession(savedSessionData);
                  setSessionStats(stats);
                  setStreak(savedStreak);
                  setTotalQuestions(savedTotal);
                  setCorrectAnswers(savedCorrect);
                  toast.success("Session resumed!");
                }
              }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <Button variant="outline" onClick={handleEndSession}>End Session</Button>
            </div>
          </div>
          <CardDescription>
            Practice and reinforce your understanding with AI-guided exercises
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
              <div className="text-center">
                <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-medium">{formatTime(elapsedTime)}</div>
                <div className="text-xs text-muted-foreground">Time</div>
              </div>
              <div className="text-center">
                <Flame className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                <div className="text-sm font-medium">{streak}</div>
                <div className="text-xs text-muted-foreground">Streak</div>
              </div>
              <div className="text-center">
                <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                <div className="text-sm font-medium">{correctAnswers}/{totalQuestions}</div>
                <div className="text-xs text-muted-foreground">Score</div>
              </div>
              <div className="text-center">
                <ChartBar className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <div className="text-sm font-medium">{Math.round((correctAnswers / Math.max(1, totalQuestions)) * 100)}%</div>
                <div className="text-xs text-muted-foreground">Accuracy</div>
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-4">
              <Brain className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <div className="text-sm font-medium">Session Progress</div>
                  <div className="text-sm text-muted-foreground">{totalQuestions} questions</div>
                </div>
                <Progress 
                  value={Math.min(100, (totalQuestions / 10) * 100)} 
                  className="mt-2" 
                />
              </div>
            </div>

            {/* Current Interaction */}
            {currentInteraction && (
              <Card className="mt-4">
                <CardContent className="pt-6">
                  {isQuestionContent(currentInteraction.content) ? (
                    <>
                      {/* Content with type QuestionContent */}
                      <div className="mb-4">
                        {currentInteraction.content.scenario && (
                          <div className="mb-4 p-4 bg-muted/30 rounded-lg text-sm">
                            {currentInteraction.content.scenario}
                            </div>
                          )}
                        <h3 className="text-lg font-semibold mb-2">
                          {currentInteraction.content.question}
                        </h3>
                        
                        {/* Show hints as steps */}
                        {currentInteraction.content.hints.length > 0 && (
                          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="text-sm font-semibold mb-2 flex items-center">
                              <ListChecks className="h-4 w-4 mr-2 text-blue-500" />
                              Steps:
                            </h4>
                            <ol className="text-sm space-y-2 list-decimal pl-5">
                              {currentInteraction.content.hints.map((hint, idx) => (
                                <li key={idx}>{hint}</li>
                              ))}
                            </ol>
                                </div>
                              )}

                        {/* User response area */}
                        <div className="mt-4">
                          <Textarea
                            placeholder="Enter your response..."
                            value={userResponse}
                            onChange={(e) => setUserResponse(e.target.value)}
                            className="min-h-[120px]"
                          />
                        </div>
                        
                        {/* Feedback display with solution */}
                        {feedback && (
                          <div className={`mt-4 p-4 rounded-lg ${
                            feedback.isCorrect 
                              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                            } border`}>
                            <div className="flex items-start">
                              {feedback.isCorrect 
                                ? <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" /> 
                                : <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />}
                              <div>
                                <h4 className="font-semibold">
                                  {feedback.isCorrect ? 'Correct!' : 'Not quite right'}
                                </h4>
                                <p className="text-sm mt-1">{feedback.message}</p>
                              </div>
                            </div>
                        </div>
                        )}
                      </div>
                    </>
                  ) : (
                    // For raw content format from the new API
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">Practice Exercise</h3>
                      <pre className="whitespace-pre-wrap bg-muted/30 p-4 rounded-lg text-sm">
                        {typeof currentInteraction.content === 'string' 
                          ? currentInteraction.content 
                          : JSON.stringify(currentInteraction.content, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="mt-6 flex flex-wrap gap-2 justify-between">
                    <div>
                        <Button
                          variant="outline"
                          onClick={handleRequestHint}
                        disabled={needsHelp}
                        >
                        <Lightbulb className="h-4 w-4 mr-2" />
                          Need a Hint?
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      {showNext ? (
                        <Button onClick={handleNextQuestion}>
                          Next Exercise <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <Button onClick={handleSubmitResponse} disabled={!userResponse?.trim()}>
                          Submit Response
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isGenerating && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PracticeSession; 