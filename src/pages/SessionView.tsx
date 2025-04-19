import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock, FileText, Target, ListChecks, BookOpen, Lightbulb, ExternalLink, Play, Image, Brain, Users, Award, Code, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import LoadingIndicator from '@/components/LoadingIndicator';
import ChatBot from '@/components/ChatBot';
import PracticeSession from '@/components/PracticeSession';
import PracticeReport from '@/components/PracticeReport';
import { useCourseContext } from '@/context/CourseContext';
import autogenService, { PersonalizedPath, CodeExplanation, ContentSummary } from '@/services/autogen-service';
import VisualRenderer from '@/components/VisualRenderer';
import type { PracticeReport as PracticeReportType } from '@/types/practice';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import ReactMarkdown from 'react-markdown';
import CodePlayground from '@/components/CodePlayground';
import { FlashcardDeck } from '../components/FlashcardDeck';
import type { Flashcard, QuizQuestion, SessionSection as CourseSessionSection } from '../types/course';

interface VisualResponse {
  type: 'mermaid' | 'flowchart' | 'markdown' | 'react-flow';
  code: string;
  style?: Record<string, any>;
}

interface FlashcardDeckProps {
  cards: Flashcard[];
  onComplete?: () => void;
}

// Rename the imported type to avoid conflict
type SessionSection = CourseSessionSection;

interface AutogenSessionSection {
  id: string;
  title: string;
  content: string;
  type: string;
  duration?: number;
  questions?: any[];
  order?: number;
  interactiveElements?: Array<{
    type: string;
    data: {
      flashcards?: {
        cards: Flashcard[];
      };
    };
  }>;
}

const SessionView = () => {
  const { courseId, moduleId, lessonId, sessionId } = useParams<{ 
    courseId: string; 
    moduleId: string; 
    lessonId: string;
    sessionId: string;
  }>();
  const navigate = useNavigate();
  const { 
    courses, 
    currentCourse, 
    setCurrentCourse,
    currentModule, 
    setCurrentModule,
    currentLesson,
    setCurrentLesson,
    currentSession,
    setCurrentSession,
    updateSession,
    updateSessionSections
  } = useCourseContext();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [generatingDiagram, setGeneratingDiagram] = useState(false);
  const [diagramImage, setDiagramImage] = useState<VisualResponse | null>(null);
  const [hasSections, setHasSections] = useState(false);
  const [mindMapImage, setMindMapImage] = useState<VisualResponse | null>(null);
  const [timelineImage, setTimelineImage] = useState<VisualResponse | null>(null);
  const [conceptMapImage, setConceptMapImage] = useState<VisualResponse | null>(null);
  const [infographicImage, setInfographicImage] = useState<VisualResponse | null>(null);
  const [showPractice, setShowPractice] = useState(false);
  const [practiceReport, setPracticeReport] = useState<PracticeReportType | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [activeAssessment, setActiveAssessment] = useState<string | null>(null);
  const [userResponses, setUserResponses] = useState<Record<string, any>>({});
  const [sectionProgress, setSectionProgress] = useState<Record<string, number>>({});
  const [contentSummary, setContentSummary] = useState<ContentSummary | null>(null);
  const [codeExplanation, setCodeExplanation] = useState<CodeExplanation | null>(null);
  const [personalizedPath, setPersonalizedPath] = useState<PersonalizedPath | null>(null);
  const [interactiveQuiz, setInteractiveQuiz] = useState<QuizQuestion[] | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isExplainingCode, setIsExplainingCode] = useState(false);
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isProvidingFeedback, setIsProvidingFeedback] = useState(false);
  
  // New state variables for additional features
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [showProgressPanel, setShowProgressPanel] = useState(false);
  const [studyTimer, setStudyTimer] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
  // First useEffect for initialization
  useEffect(() => {
    if (courseId && moduleId && lessonId && sessionId) {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        setCurrentCourse(course);
        const module = course.modules.find(m => m.id === moduleId);
        if (module) {
          setCurrentModule(module);
          const lesson = module.lessons.find(l => l.id === lessonId);
          if (lesson) {
            setCurrentLesson(lesson);
            const session = lesson.sessions.find(s => s.id === sessionId);
            if (session) {
              setCurrentSession(session);
            } else {
              navigate(`/course/${courseId}/module/${moduleId}/lesson/${lessonId}`);
            }
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
      setCurrentSession(null);
    };
  }, [courseId, moduleId, lessonId, sessionId, courses, navigate, setCurrentCourse, setCurrentModule, setCurrentLesson, setCurrentSession]);
  
  // Second useEffect for sections check
  useEffect(() => {
    if (currentSession?.sections && currentSession.sections.length > 0) {
      setHasSections(true);
      if (activeTab === "overview") {
        setActiveTab("content");
      }
    } else {
      setHasSections(false);
    }
  }, [currentSession, activeTab]);

  const generateSessionContent = async () => {
    if (!currentCourse || !currentModule || !currentLesson || !currentSession) return;
    
    setIsGenerating(true);
    
    try {
      const response = await autogenService.generateSessionContent(
        currentSession.title,
        currentSession.duration.toString(),
        currentSession.objectives,
        currentLesson.content,
        currentModule.name,
        currentCourse.difficulty
      );
      
      if (response.success && response.data) {
        // Map the response data to match the expected SessionSection type
        const sectionsWithRequiredProps: SessionSection[] = response.data.map((section: AutogenSessionSection) => ({
          id: section.id,
          title: section.title,
          content: section.content,
          type: mapSectionType(section.type),
          duration: section.duration || 30, // Default duration of 30 minutes
          questions: section.questions?.map(q => ({
            question: q.question || '',
            answer: q.answer || '',
            type: 'quiz',
            hints: []
          })) || [],
          interactiveElements: section.interactiveElements ? [{
            type: 'flashcards',
            data: {
              flashcards: {
                cards: section.interactiveElements.find(el => el.type === 'flashcards')?.data.flashcards?.cards || []
              }
            }
          }] : [],
          completed: false,
          order: section.order || 0,
          resources: [],
          codeExercises: [],
          groupActivities: [],
          assessments: [],
          prerequisites: [],
          nextSteps: []
        }));
        
        updateSessionSections(
          currentCourse.id,
          currentModule.id,
          currentLesson.id,
          currentSession.id,
          sectionsWithRequiredProps
        );
      }
    } catch (error) {
      console.error("Failed to generate session content:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Helper function to map section types
  const mapSectionType = (type: string): SessionSection['type'] => {
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
        return 'reading';
      default:
        return 'reading';
    }
  };
  
  const toggleSessionCompletion = () => {
    if (!currentCourse || !currentModule || !currentLesson || !currentSession) return;
    
    updateSession(
      currentCourse.id,
      currentModule.id,
      currentLesson.id,
      currentSession.id,
      { completed: !currentSession.completed }
    );
  };
  
  const generateDiagram = async (topic: string) => {
    if (!currentSession) return;
    
    setGeneratingDiagram(true);
    
    try {
      const response = await autogenService.generateDiagram(topic);
      
      if (response.success && response.data) {
        setDiagramImage(response.data);
      }
    } catch (error) {
      console.error("Failed to generate diagram:", error);
    } finally {
      setGeneratingDiagram(false);
    }
  };
  
  const generateMindMap = async () => {
    if (!currentSession) return;
    
    try {
      const concepts = currentSession.objectives.concat(
        currentSession.sections?.map(s => s.title) || []
      );
      
      const response = await autogenService.generateMindMap(currentSession.title, concepts);
      if (response.success && response.data) {
        setMindMapImage(response.data);
      }
    } catch (error) {
      console.error("Failed to generate mind map:", error);
    }
  };

  const generateTimeline = async () => {
    if (!currentSession?.sections) return;
    
    try {
      const events = currentSession.sections.map(section => ({
        title: section.title,
        description: section.content.substring(0, 100) + '...',
        date: section.duration.toString()
      }));
      
      const response = await autogenService.generateTimeline(events);
      if (response.success && response.data) {
        setTimelineImage(response.data);
      }
    } catch (error) {
      console.error("Failed to generate timeline:", error);
    }
  };

  const generateConceptMap = async () => {
    if (!currentSession?.sections) return;
    
    try {
      const concepts = currentSession.sections.flatMap((section, i, arr) => {
        if (i === arr.length - 1) return [];
        return [{
          from: section.title,
          to: arr[i + 1].title,
          relationship: "leads to"
        }];
      });
      
      const response = await autogenService.generateConceptMap(concepts);
      if (response.success && response.data) {
        setConceptMapImage(response.data);
      }
    } catch (error) {
      console.error("Failed to generate concept map:", error);
    }
  };

  const generateInfographic = async () => {
    if (!currentSession) return;
    
    try {
      const data = {
        title: currentSession.title,
        duration: currentSession.duration,
        objectives: currentSession.objectives,
        keyPoints: currentSession.sections?.map(s => s.title) || []
      };
      
      const response = await autogenService.generateInfographic(currentSession.title, data);
      if (response.success && response.data) {
        setInfographicImage(response.data);
      }
    } catch (error) {
      console.error("Failed to generate infographic:", error);
    }
  };
  
  const handlePracticeComplete = (report: PracticeReportType) => {
    setPracticeReport(report);
    setShowPractice(false);
  };
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleAssessmentSubmit = (sectionId: string, assessmentType: string, responses: any) => {
    setUserResponses(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [assessmentType]: responses
      }
    }));

    // Update section progress
    setSectionProgress(prev => ({
      ...prev,
      [sectionId]: calculateSectionProgress(sectionId)
    }));
  };

  const calculateSectionProgress = (sectionId: string) => {
    const section = currentSession?.sections?.find(s => s.id === sectionId);
    if (!section) return 0;

    const totalItems = [
      section.questions?.length || 0,
      section.interactiveElements?.length || 0,
      section.groupActivities?.length || 0,
      section.assessments?.length || 0
    ].reduce((a, b) => a + b, 0);

    const completedItems = Object.keys(userResponses[sectionId] || {}).length;
    return Math.round((completedItems / Math.max(1, totalItems)) * 100);
  };
  
  const getFlashcardsFromSection = (section: SessionSection): Flashcard[] => {
    const flashcardElement = section.interactiveElements?.find(
      element => element.type === 'flashcards'
    );
    return flashcardElement?.data?.flashcards?.cards || [];
  };

  const getAllFlashcards = (): Flashcard[] => {
    return currentSession?.sections?.reduce((allCards, section) => {
      const sectionCards = getFlashcardsFromSection(section);
      return [...allCards, ...sectionCards];
    }, [] as Flashcard[]) || [];
  };
  
  const generateContentSummary = async (content: string) => {
    setIsGeneratingSummary(true);
    try {
      const response = await autogenService.generateContent(content, 'text', { content });
      if (response.success && response.data) {
        setContentSummary(response.data);
      }
    } catch (error) {
      console.error("Failed to generate content summary:", error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const explainCode = async (code: string, language: string) => {
    setIsExplainingCode(true);
    try {
      const response = await autogenService.explainCode(code, language);
      if (response.success && response.data) {
        setCodeExplanation(response.data);
      }
    } catch (error) {
      console.error("Failed to explain code:", error);
    } finally {
      setIsExplainingCode(false);
    }
  };

  const generatePersonalizedPath = async (topic: string, userLevel: string) => {
    setIsGeneratingPath(true);
    try {
      const response = await autogenService.generatePersonalizedPath(topic, userLevel);
      if (response.success && response.data) {
        setPersonalizedPath(response.data);
      }
    } catch (error) {
      console.error("Failed to generate personalized path:", error);
    } finally {
      setIsGeneratingPath(false);
    }
  };

  const generateInteractiveQuiz = async (topic: string, difficulty: string) => {
    setIsGeneratingQuiz(true);
    try {
      const response = await autogenService.generateInteractiveQuiz(topic, difficulty);
      if (response.success && response.data) {
        setInteractiveQuiz(response.data as QuizQuestion[]);
      }
    } catch (error) {
      console.error("Failed to generate interactive quiz:", error);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const provideFeedback = async (response: string, correctAnswer: string) => {
    setIsProvidingFeedback(true);
    try {
      const result = await autogenService.provideFeedback(response, correctAnswer);
      if (result.success && result.data) {
        setFeedback(result.data);
      }
    } catch (error) {
      console.error("Failed to provide feedback:", error);
    } finally {
      setIsProvidingFeedback(false);
    }
  };
  
  // New functions for additional features
  const toggleNotesPanel = () => {
    setShowNotesPanel(!showNotesPanel);
  };

  const toggleBookmarksPanel = () => {
    setShowBookmarksPanel(!showBookmarksPanel);
  };

  const toggleProgressPanel = () => {
    setShowProgressPanel(!showProgressPanel);
  };

  const saveNote = (sectionId: string) => {
    if (currentNote.trim()) {
      setNotes(prev => ({
        ...prev,
        [sectionId]: currentNote
      }));
      setCurrentNote('');
    }
  };

  const toggleBookmark = (sectionId: string) => {
    setBookmarks(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const startTimer = () => {
    if (!isTimerRunning) {
      setIsTimerRunning(true);
      const interval = setInterval(() => {
        setStudyTimer(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    }
  };

  const pauseTimer = () => {
    if (isTimerRunning && timerInterval) {
      clearInterval(timerInterval);
      setIsTimerRunning(false);
    }
  };

  const resetTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    setStudyTimer(0);
    setIsTimerRunning(false);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);
  
  if (!currentCourse || !currentModule || !currentLesson || !currentSession) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-medium mb-4">Session Not Found</h2>
            <p className="text-muted-foreground mb-6">The session you're looking for doesn't exist or has been deleted.</p>
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
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        title={`Day ${currentSession.day}: ${currentSession.title}`}
        subtitle={`Session from ${currentLesson.title}`}
        backLink={`/course/${currentCourse.id}/module/${currentModule.id}/lesson/${currentLesson.id}`}
        backLabel="Back to Lesson"
        viewType="session"
      />
      
      <main className="flex-grow py-10">
        <div className="container-wide">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={toggleSessionCompletion}
                className={currentSession.completed ? "bg-primary/5 border-primary/20 text-primary" : ""}
              >
                {currentSession.completed ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Completed
                  </>
                ) : (
                  "Mark as Completed"
                )}
              </Button>
              
              {hasSections && !diagramImage && (
                <Button
                  variant="outline"
                  onClick={() => generateDiagram(currentSession.title)}
                  disabled={generatingDiagram}
                >
                  {generatingDiagram ? (
                    <LoadingIndicator size="sm" inline label="Generating..." />
                  ) : (
                    <>
                      <Image className="mr-2 h-4 w-4" />
                      Generate Diagram
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={toggleNotesPanel}
                className={showNotesPanel ? "bg-primary/5 border-primary/20 text-primary" : ""}
              >
                <FileText className="mr-2 h-4 w-4" />
                Notes
              </Button>
              
              <Button
                variant="outline"
                onClick={toggleBookmarksPanel}
                className={showBookmarksPanel ? "bg-primary/5 border-primary/20 text-primary" : ""}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Bookmarks
              </Button>
              
              <Button
                variant="outline"
                onClick={toggleProgressPanel}
                className={showProgressPanel ? "bg-primary/5 border-primary/20 text-primary" : ""}
              >
                <Target className="mr-2 h-4 w-4" />
                Progress
              </Button>
            </div>
            
            {!hasSections && !isGenerating && (
              <Button onClick={generateSessionContent}>
                <Play className="mr-2 h-4 w-4" />
                Generate Session Content
              </Button>
            )}
          </div>
          
          {/* Study Timer */}
          <div className="mb-6 p-4 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Study Timer</h3>
              </div>
              <div className="text-2xl font-mono">{formatTime(studyTimer)}</div>
              <div className="flex gap-2">
                {!isTimerRunning ? (
                  <Button size="sm" onClick={startTimer}>
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={pauseTimer}>
                    <Clock className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={resetTimer}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
          
          {/* Notes Panel */}
          {showNotesPanel && (
            <div className="mb-6 p-4 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Session Notes</h3>
                <Button size="sm" variant="outline" onClick={toggleNotesPanel}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Add Note</h4>
                  <textarea
                    className="w-full p-3 border rounded-md bg-background"
                    rows={4}
                    placeholder="Write your notes here..."
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <Button 
                      size="sm" 
                      onClick={() => activeSectionId && saveNote(activeSectionId)}
                      disabled={!activeSectionId || !currentNote.trim()}
                    >
                      Save Note
                    </Button>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Your Notes</h4>
                  <ScrollArea className="h-40 border rounded-md p-3 bg-background">
                    {Object.keys(notes).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(notes).map(([sectionId, note]) => {
                          const section = currentSession?.sections?.find(s => s.id === sectionId);
                          return (
                            <div key={sectionId} className="p-2 border rounded-md">
                              <div className="font-medium text-sm">{section?.title || 'Section'}</div>
                              <p className="text-sm text-muted-foreground">{note}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No notes yet. Add a note to get started.</p>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}
          
          {/* Bookmarks Panel */}
          {showBookmarksPanel && (
            <div className="mb-6 p-4 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Bookmarked Sections</h3>
                <Button size="sm" variant="outline" onClick={toggleBookmarksPanel}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-40 border rounded-md p-3 bg-background">
                {bookmarks.length > 0 ? (
                  <div className="space-y-2">
                    {bookmarks.map(sectionId => {
                      const section = currentSession?.sections?.find(s => s.id === sectionId);
                      return (
                        <div key={sectionId} className="flex items-center justify-between p-2 border rounded-md">
                          <div>
                            <div className="font-medium text-sm">{section?.title || 'Section'}</div>
                            <div className="text-xs text-muted-foreground">{section?.type}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setActiveSectionId(sectionId);
                                setExpandedSections(prev => 
                                  prev.includes(sectionId) ? prev : [...prev, sectionId]
                                );
                                setActiveTab("content");
                                toggleBookmarksPanel();
                              }}
                            >
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => toggleBookmark(sectionId)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No bookmarks yet. Bookmark sections to find them quickly.</p>
                )}
              </ScrollArea>
            </div>
          )}
          
          {/* Progress Panel */}
          {showProgressPanel && (
            <div className="mb-6 p-4 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Session Progress</h3>
                <Button size="sm" variant="outline" onClick={toggleProgressPanel}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary"></div>
                    <span className="text-sm">Overall Progress</span>
                  </div>
                  <div className="text-sm font-medium">
                    {currentSession?.sections 
                      ? Math.round(Object.values(sectionProgress).reduce((a, b) => a + b, 0) / currentSession.sections.length) 
                      : 0}%
                  </div>
                </div>
                <Progress 
                  value={currentSession?.sections 
                    ? Object.values(sectionProgress).reduce((a, b) => a + b, 0) / currentSession.sections.length 
                    : 0} 
                  className="h-2"
                />
                
                <div className="space-y-2">
                  {currentSession?.sections?.map(section => (
                    <div key={section.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{section.title}</span>
                        <span className="text-sm font-medium">{sectionProgress[section.id] || 0}%</span>
                      </div>
                      <Progress value={sectionProgress[section.id] || 0} className="h-1" />
                    </div>
                  ))}
                </div>
                
                <div className="pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm">Time Spent</span>
                    </div>
                    <span className="text-sm font-medium">{formatTime(studyTimer)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {hasSections ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
              <TabsList className="grid w-full sm:w-auto grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="practice">Practice</TabsTrigger>
                <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                <TabsTrigger value="quiz">Quiz</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-6">
                <Card className="bg-card/95 backdrop-blur-sm border-border/50 mb-8">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="self-start">
                        Day {currentSession.day}
                      </Badge>
                      <Badge variant="secondary" className="flex gap-1.5 items-center">
                        <Clock size={12} />
                        <span>{currentSession.duration}</span>
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl">{currentSession.title}</CardTitle>
                    <CardDescription>
                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-sm font-medium">Objectives:</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {currentSession.objectives.map((objective, i) => (
                            <li key={i} className="text-muted-foreground">{objective}</li>
                          ))}
                        </ul>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  
                  {diagramImage && (
                    <CardContent className="pb-2">
                      <div className="rounded-md border border-border/50 overflow-hidden mb-4">
                        <VisualRenderer 
                          type={diagramImage.type}
                          code={diagramImage.code}
                          style={diagramImage.style}
                          className="w-full"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
                
                <div className="space-y-10">
                  {currentSession.sections && currentSession.sections.map((section, index) => (
                    <Card key={index} className="bg-card/95 backdrop-blur-sm border-border/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge>{section.type}</Badge>
                            <Badge variant="outline">{section.duration}</Badge>
                          </div>
                        </div>
                        <CardTitle className="text-xl mt-2">{section.title}</CardTitle>
                      </CardHeader>
                      
                      <CardContent className="pt-4">
                        <div className="prose max-w-none">
                          {section.content.split('\n\n').map((paragraph, i) => (
                            <p key={i} className="mb-4 text-muted-foreground">{paragraph}</p>
                          ))}
                        </div>
                        
                        {section.resources && section.resources.length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-sm font-medium mb-3">Related Resources</h4>
                            <div className="flex flex-wrap gap-2">
                              {section.resources.map((resource, i) => (
                                <a 
                                  key={i}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm hover:bg-primary/20 transition-colors"
                                >
                                  <span>{resource.title}</span>
                                  <ExternalLink size={12} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {section.questions && section.questions.length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-sm font-medium mb-3">Discussion Questions</h4>
                            <div className="space-y-4">
                              {section.questions.map((qa, i) => (
                                <div key={i} className="bg-muted/50 rounded-lg p-4">
                                  <p className="font-medium mb-2">{qa.question}</p>
                                  <p className="text-sm text-muted-foreground">{qa.answer}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="content" className="mt-6">
                <div className="space-y-6">
                  {currentSession.sections?.map((section, index) => (
                    <Collapsible
                      key={section.id}
                      open={expandedSections.includes(section.id)}
                      onOpenChange={() => {
                        toggleSection(section.id);
                        setActiveSectionId(section.id);
                      }}
                      className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden"
                    >
                      <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{section.type}</Badge>
                          <div className="text-left">
                            <h3 className="font-medium">{section.title}</h3>
                            <p className="text-sm text-muted-foreground">{section.duration}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Progress value={sectionProgress[section.id] || 0} className="w-24" />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBookmark(section.id);
                            }}
                            className={bookmarks.includes(section.id) ? "text-primary" : ""}
                          >
                            <BookOpen className="h-4 w-4" />
                          </Button>
                          {expandedSections.includes(section.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="p-4 space-y-6">
                          {/* Main Content */}
                          <div className="prose max-w-none">
                            <ReactMarkdown>{section.content}</ReactMarkdown>
                          </div>
                          
                          {/* Notes Section */}
                          <div className="border-t border-border/40 pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Notes
                              </h4>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setActiveSectionId(section.id);
                                  setCurrentNote(notes[section.id] || '');
                                  setShowNotesPanel(true);
                                }}
                              >
                                {notes[section.id] ? "Edit Note" : "Add Note"}
                              </Button>
                            </div>
                            {notes[section.id] ? (
                              <div className="p-3 bg-muted/50 rounded-md">
                                <p className="text-sm">{notes[section.id]}</p>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No notes for this section yet.</p>
                            )}
                          </div>
                          
                          {/* Resources */}
                          {section.resources && section.resources.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-medium flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                Resources
                              </h4>
                              <div className="grid gap-2">
                                {section.resources.map((resource, i) => (
                                  <a
                                    key={i}
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                                  >
                                    <div>
                                      <div className="font-medium">{resource.title}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {resource.type} • {resource.duration || 'N/A'} • 
                                        {resource.difficulty || 'All levels'}
                                      </div>
                                    </div>
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Interactive Elements */}
                          {section.interactiveElements && section.interactiveElements.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-medium flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                Interactive Elements
                              </h4>
                              <div className="grid gap-4">
                                {section.interactiveElements.map((element, i) => (
                                  <div key={i} className="border rounded-lg p-4">
                                    {element.type === 'code' && (
                                      <div className="space-y-2">
                                        <h5 className="font-medium">Code Playground</h5>
                                        {section.type === 'exercise' && section.codeExercises && (
                                          <div className="space-y-6">
                                            {section.codeExercises.map((exercise, index) => (
                                              <CodePlayground
                                                key={exercise.id || index}
                                                exercise={exercise}
                                                onComplete={(result) => {
                                                  // Update progress and handle completion
                                                  const progress = calculateSectionProgress(section.id);
                                                  setSectionProgress(prev => ({
                                                    ...prev,
                                                    [section.id]: progress
                                                  }));
                                                  
                                                  // Handle assessment submission if needed
                                                  if (section.assessments?.length) {
                                                    handleAssessmentSubmit(section.id, 'code_challenge', {
                                                      exerciseId: exercise.id,
                                                      result
                                                    });
                                                  }
                                                }}
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {/* Add other interactive element types */}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Group Activities */}
                          {section.groupActivities && section.groupActivities.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-medium flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Group Activities
                              </h4>
                              <div className="grid gap-4">
                                {section.groupActivities.map((activity, i) => (
                                  <div key={i} className="border rounded-lg p-4">
                                    <h5 className="font-medium">{activity.title}</h5>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {activity.description}
                                    </p>
                                    <div className="mt-4 grid gap-4">
                                      <div>
                                        <h6 className="text-sm font-medium mb-2">Roles</h6>
                                        <div className="flex flex-wrap gap-2">
                                          {activity.roles.map((role, j) => (
                                            <Badge key={j} variant="secondary">{role}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <h6 className="text-sm font-medium mb-2">Objectives</h6>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                          {activity.objectives.map((obj, j) => (
                                            <li key={j}>• {obj}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div>
                                        <h6 className="text-sm font-medium mb-2">Deliverables</h6>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                          {activity.deliverables.map((del, j) => (
                                            <li key={j}>• {del}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Assessments */}
                          {section.assessments && section.assessments.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-medium flex items-center gap-2">
                                <Award className="h-4 w-4" />
                                Assessments
                              </h4>
                              <div className="grid gap-4">
                                {section.assessments.map((assessment, i) => (
                                  <div key={i} className="border rounded-lg p-4">
                                    <h5 className="font-medium mb-4">
                                      {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)}
                                    </h5>
                                    {/* Add assessment component based on type */}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Adaptive Content */}
                          {section.adaptiveContent && (
                            <div className="space-y-3">
                              <h4 className="font-medium flex items-center gap-2">
                                <Brain className="h-4 w-4" />
                                Additional Resources
                              </h4>
                              <div className="grid gap-4">
                                {section.adaptiveContent.variations.map((variation, i) => (
                                  <div key={i} className="border rounded-lg p-4">
                                    <h5 className="font-medium">{variation.condition}</h5>
                                    <div className="mt-2 prose max-w-none">
                                      <ReactMarkdown>{variation.content}</ReactMarkdown>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Next Steps */}
                          {section.nextSteps && section.nextSteps.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-medium flex items-center gap-2">
                                <ChevronRight className="h-4 w-4" />
                                Next Steps
                              </h4>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {section.nextSteps.map((step, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4" />
                                    {step}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="practice" className="mt-6">
                <div className="space-y-6">
                  {!showPractice && !practiceReport && (
                    <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Practice Session</CardTitle>
                        <CardDescription>
                          Test your understanding and get personalized feedback
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Brain className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Interactive Practice</h3>
                            <p className="text-sm text-muted-foreground">
                              Get real-time feedback and hints as you practice the concepts from this session
                            </p>
                          </div>
                      </div>
                        <Button 
                          className="w-full sm:w-auto"
                          onClick={() => setShowPractice(true)}
                        >
                          Start Practice Session
                        </Button>
                    </CardContent>
                  </Card>
                  )}
                
                  {showPractice && (
                    <PracticeSession
                      courseId={courseId}
                      moduleId={moduleId}
                      lessonId={lessonId}
                      onComplete={handlePracticeComplete}
                    />
                  )}

                  {practiceReport && (
                    <>
                      <PracticeReport report={practiceReport} />
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPracticeReport(null);
                            setShowPractice(true);
                          }}
                        >
                          Start New Practice Session
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="flashcards" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Flashcards</CardTitle>
                    <CardDescription>
                      Review key concepts from this session using interactive flashcards.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentSession?.sections && currentSession.sections.length > 0 ? (
                      <FlashcardDeck
                        cards={getAllFlashcards()}
                        onComplete={() => {
                          // Update progress when flashcards are completed
                          if (currentSession) {
                            handleAssessmentSubmit(currentSession.id, 'flashcards', {
                              completed: true,
                              score: 100,
                              timeSpent: 0
                            });
                          }
                        }}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          No flashcards available yet. Generate session content to create flashcards.
                        </p>
                        <Button onClick={generateSessionContent}>
                          Generate Content
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="quiz" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Interactive Quiz</CardTitle>
                    <CardDescription>
                      Test your understanding with AI-generated questions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!interactiveQuiz ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Brain className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-medium">AI-Powered Quiz</h3>
                            <p className="text-sm text-muted-foreground">
                              Get personalized questions based on the session content
                            </p>
                          </div>
                        </div>
                        <Button 
                          className="w-full sm:w-auto"
                          onClick={() => generateInteractiveQuiz(currentSession.title, 'medium')}
                          disabled={isGeneratingQuiz}
                        >
                          {isGeneratingQuiz ? (
                            <LoadingIndicator size="sm" inline label="Generating quiz..." />
                          ) : (
                            <>
                              <Brain className="mr-2 h-4 w-4" />
                              Generate Quiz
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {interactiveQuiz.map((question, index) => (
                          <div key={question.id} className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Question {index + 1}</h4>
                            <p className="mb-4">{question.question}</p>
                            <div className="space-y-2">
                              {question.options.map((option, optionIndex) => (
                                <Button
                                  key={optionIndex}
                                  variant="outline"
                                  className="w-full justify-start"
                                  onClick={() => provideFeedback(option, question.correctAnswer)}
                                >
                                  {option}
                                </Button>
                              ))}
                            </div>
                            {feedback && (
                              <div className="mt-4 p-4 bg-muted rounded-lg">
                                <p className="text-sm">{feedback}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="progress" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Session Progress</CardTitle>
                    <CardDescription>Track your progress through this session's content</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="space-y-6">
                      {currentSession.sections?.map((section) => (
                        <div key={section.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{section.title}</h4>
                              <p className="text-sm text-muted-foreground">{section.type}</p>
                            </div>
                            <span className="text-sm font-medium">{sectionProgress[section.id] || 0}%</span>
                          </div>
                          <Progress value={sectionProgress[section.id] || 0} />
                        </div>
                      ))}
                    </div>
                    </CardContent>
                  </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="mb-12">
              <Card className="bg-card/95 backdrop-blur-sm border-border/50 mb-8">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="self-start">
                      Day {currentSession.day}
                    </Badge>
                    <Badge variant="secondary" className="flex gap-1.5 items-center">
                      <Clock size={12} />
                      <span>{currentSession.duration}</span>
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{currentSession.title}</CardTitle>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Target size={16} className="text-primary" />
                        Learning Objectives
                      </h3>
                      <ul className="space-y-1.5">
                        {currentSession.objectives.map((objective, index) => (
                          <li key={index} className="flex gap-2 text-muted-foreground">
                            <span className="text-primary">•</span>
                            <span>{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {currentSession.activities && currentSession.activities.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <ListChecks size={16} className="text-primary" />
                          Activities
                        </h3>
                        <ul className="space-y-1.5">
                          {currentSession.activities.map((activity, index) => (
                            <li key={index} className="flex gap-2 text-muted-foreground">
                              <span className="text-primary font-medium">{index + 1}.</span>
                              <span>{activity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {currentSession.materials && currentSession.materials.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <BookOpen size={16} className="text-primary" />
                          Materials
                        </h3>
                        <ul className="space-y-1.5">
                          {currentSession.materials.map((material, index) => (
                            <li key={index} className="flex gap-2 text-muted-foreground">
                              <span className="text-primary">•</span>
                              <span>{material}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {currentSession.homework && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <FileText size={16} className="text-primary" />
                          Homework
                        </h3>
                        <p className="text-muted-foreground">{currentSession.homework}</p>
                      </div>
                    )}
                    
                    {currentSession.notes && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Lightbulb size={16} className="text-primary" />
                          Implementation Notes
                        </h3>
                        <p className="text-muted-foreground">{currentSession.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-center pt-2 border-t border-border/40">
                  {isGenerating ? (
                    <LoadingIndicator size="sm" label="Generating detailed content..." />
                  ) : (
                    <Button onClick={generateSessionContent} className="gap-2">
                      <Play className="h-4 w-4" />
                      Generate Detailed Session Content
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </main>
      <ChatBot />
    </div>
  );
};

export default SessionView;
