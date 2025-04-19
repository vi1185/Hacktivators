import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersonaContext } from '@/context/PersonaContext';
import { useCourseContext } from '@/context/CourseContext';
import PersonaSelectionCard from '@/components/PersonaSelectionCard';
import PersonaCreationForm from '@/components/PersonaCreationForm';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Users, UserCircle, Sparkles, ArrowRight } from 'lucide-react';
import LoadingIndicator from '@/components/LoadingIndicator';
import type { UserAssessment } from '@/types/course';
import type { Persona } from '@/types/persona';
import autogenService from '@/services/autogen-service';

interface AssessmentState {
  fromAssessment: boolean;
  topic: string;
  difficulty: string;
  duration: string;
  assessment: UserAssessment;
}

interface ContentReturnState extends AssessmentState {
  returnPath?: string;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  sessionId?: string;
  viewType?: 'module' | 'lesson' | 'session';
  fromContentView?: boolean;
}

const PersonaSelection: React.FC = () => {
  const { personas, generatePersona, isGenerating, setCurrentPersona } = usePersonaContext();
  const { addCourse, setCurrentCourse } = useCourseContext();
  const [selectedTab, setSelectedTab] = useState('select');
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [generatingCourse, setGeneratingCourse] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if coming from assessment or content view
  const locationState = location.state as ContentReturnState | null;
  const isFromAssessment = locationState?.fromAssessment || false;
  const isFromContentView = locationState?.fromContentView || false;

  useEffect(() => {
    // If coming from assessment or content view, set the topic
    if (locationState?.topic) {
      setTopic(locationState.topic);
    }
  }, [locationState]);

  const handlePersonaSelect = (personaId: string) => {
    setSelectedPersona(personaId);
  };

  const handleCreatePersona = async (userInput: string, chosenTopic: string) => {
    await generatePersona(userInput, chosenTopic);
    
    // Navigate based on where the user came from
    if (isFromAssessment) {
      navigate('/persona/detail', { state: location.state });
    } else if (isFromContentView && locationState?.returnPath) {
      navigate('/persona/detail', { state: location.state });
    } else {
      navigate('/persona/detail');
    }
  };

  const handleContinueWithPersona = async () => {
    if (!selectedPersona) return;
    
    const persona = personas.find(p => p.id === selectedPersona);
    if (persona) {
      setCurrentPersona(persona);
      
      // If coming from assessment, generate a course with the persona
      if (isFromAssessment && locationState) {
        try {
          setGeneratingCourse(true);
          
          // Generate course using the persona and assessment data
          const response = await autogenService.generateCourseWithPersona(
            persona.id,
            locationState.topic,
            locationState.difficulty as "beginner" | "intermediate" | "advanced",
            locationState.duration as "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks"
          );
          
          if (response.success && response.data) {
            // Add the course to context
            addCourse(response.data);
            
            // Set as current course
            setCurrentCourse(response.data);
            
            toast.success('Course generated with your chosen persona!', {
              description: `${persona.name} has created a personalized learning experience for you.`
            });
            
            // Make sure we have a valid course ID
            const courseId = response.data.id;
            if (!courseId) {
              console.error("Generated course has no ID");
              toast.error("Course generated but has no ID", {
                description: "Please try again or check course list"
              });
              navigate('/courses');
              return;
            }
            
            // Navigate to the new course page with the ID
            console.log("Navigating to course:", courseId);
            
            // Use a timeout to ensure state is updated before navigation
            setTimeout(() => {
              navigate(`/course/${courseId}`, {
                state: { newCourse: true }
              });
            }, 100);
          } else {
            console.error("Failed to generate course:", response.error);
            toast.error("Failed to generate course", {
              description: response.error ? String(response.error) : "Please try again"
            });
            navigate('/persona/detail', { state: location.state });
          }
        } catch (error) {
          console.error("Course generation failed:", error);
          toast.error("Course generation failed", {
            description: "Please try again later"
          });
          navigate('/persona/detail', { state: location.state });
        } finally {
          setGeneratingCourse(false);
        }
      } 
      // If coming from a content view, return to that view with the new persona
      else if (isFromContentView && locationState?.returnPath) {
        toast.success(`${persona.name} is now your learning guide`, {
          description: `Your learning experience will reflect ${persona.name}'s teaching style`
        });
        
        // Return to the original content view
        navigate(locationState.returnPath);
      }
      // Regular flow without assessment or return path
      else {
        navigate('/persona/detail');
      }
    }
  };

  // Default personas if none exist yet
  const defaultPersonas: Persona[] = [
    {
      id: 'default-1',
      name: 'Professor Alex',
      description: 'A methodical teacher who breaks down complex topics into digestible components with a focus on building strong fundamentals.',
      role: 'teacher',
      specialties: ['Structured Learning', 'Academic Depth', 'Conceptual Analysis'],
      teachingStyle: 'Methodical and thorough',
      tone: 'Professional with a touch of warmth',
      background: 'Has 15+ years of experience teaching at prestigious universities',
      characteristics: ['Patient', 'Detail-oriented', 'Analytical'],
      supportingQualities: ['Explains complex topics simply', 'Provides thoughtful analogies', 'Focuses on deep understanding'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userProfileId: 'default'
    },
    {
      id: 'default-2',
      name: 'Coach Taylor',
      description: 'An energetic and motivating guide who focuses on practical applications and quick wins to keep you engaged and making progress.',
      role: 'coach',
      specialties: ['Practical Skills', 'Motivation', 'Applied Learning'],
      teachingStyle: 'Energetic and hands-on',
      tone: 'Enthusiastic and encouraging',
      background: 'Former industry professional with a passion for teaching practical skills',
      characteristics: ['Motivating', 'Practical', 'Result-focused'],
      supportingQualities: ['Challenges you to grow', 'Celebrates small victories', 'Makes learning fun and engaging'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userProfileId: 'default'
    }
  ];

  const displayPersonas = personas.length > 0 ? personas : defaultPersonas;

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {isFromAssessment 
              ? 'Choose Your Learning Companion' 
              : 'Personalized Learning Experience'}
          </h1>
          <p className="text-muted-foreground">
            {isFromAssessment 
              ? `Based on your assessment for "${locationState?.topic}", select a teaching persona that matches your learning style.` 
              : 'Choose a learning persona that matches your preferences or create a custom one tailored to your needs.'}
          </p>
        </div>

        {generatingCourse && (
          <Card className="p-8 text-center">
            <LoadingIndicator size="lg" />
            <p className="mt-4 text-muted-foreground">
              Creating your personalized course with {personas.find(p => p.id === selectedPersona)?.name}...
            </p>
          </Card>
        )}

        {!generatingCourse && (
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-[400px]">
              <TabsTrigger value="select" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Select Persona
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Custom
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="select" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayPersonas.map((persona) => (
                  <PersonaSelectionCard
                    key={persona.id}
                    persona={persona}
                    isSelected={persona.id === selectedPersona}
                    onSelect={() => handlePersonaSelect(persona.id)}
                  />
                ))}
              </div>
              
              <div className="mt-8 flex justify-end">
                <Button 
                  size="lg"
                  onClick={handleContinueWithPersona}
                  disabled={!selectedPersona}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isFromAssessment 
                    ? 'Generate Course with Selected Persona' 
                    : 'Continue with Selected Persona'}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="create" className="mt-6">
              <PersonaCreationForm 
                onSubmit={handleCreatePersona}
                isLoading={isGenerating}
                topic={topic}
                setTopic={setTopic}
              />
            </TabsContent>
          </Tabs>
        )}

        {isFromAssessment && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Based on your assessment</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We've analyzed your learning preferences and can now create a custom course matched to your style.
              Selecting a teaching persona will further personalize your learning experience.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-background p-3 rounded-md">
                <div className="font-medium">Learning Style</div>
                <div className="text-muted-foreground">
                  {locationState?.assessment.learningStyle.visual > 0 && 'Visual '}
                  {locationState?.assessment.learningStyle.auditory > 0 && 'Auditory '}
                  {locationState?.assessment.learningStyle.reading > 0 && 'Reading '}
                  {locationState?.assessment.learningStyle.kinesthetic > 0 && 'Kinesthetic'}
                </div>
              </div>
              <div className="bg-background p-3 rounded-md">
                <div className="font-medium">Difficulty Level</div>
                <div className="text-muted-foreground capitalize">
                  {locationState?.difficulty || 'Beginner'}
                </div>
              </div>
              <div className="bg-background p-3 rounded-md">
                <div className="font-medium">Recommended Pace</div>
                <div className="text-muted-foreground capitalize">
                  {locationState?.assessment.recommendedPace || 'Standard'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonaSelection; 