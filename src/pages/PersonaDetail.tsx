import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersonaContext } from '@/context/PersonaContext';
import { useCourseContext } from '@/context/CourseContext';
import { Button } from '@/components/ui/button';
import PersonaDetail from '@/components/PersonaDetail';
import autogenService from '@/services/autogen-service';
import LoadingIndicator from '@/components/LoadingIndicator';
import { ArrowLeft } from 'lucide-react';

const PersonaDetailPage: React.FC = () => {
  const { 
    currentPersona, 
    personaContent, 
    updatePersona, 
    generateCourseWithPersona,
    isGenerating 
  } = usePersonaContext();
  const { setCurrentCourse } = useCourseContext();
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // If no current persona, redirect to selection page
    if (!currentPersona) {
      navigate('/persona');
      return;
    }

    // If we have a persona but no content, fetch it
    if (currentPersona && !personaContent) {
      const fetchContent = async () => {
        setLoading(true);
        try {
          // For now, use a default topic if none is specified
          const topicToUse = topic || 'general knowledge';
          const result = await autogenService.getPersonaContentForTopic(
            currentPersona.id,
            topicToUse,
            'introduction'
          );
          
          if (result.success && result.data) {
            setTopic(topicToUse);
          }
        } catch (error) {
          console.error('Failed to fetch persona content:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchContent();
    }
  }, [currentPersona, personaContent, navigate, topic]);

  const handleUpdatePersona = async (personaId: string, changes: string) => {
    await updatePersona(personaId, changes);
  };

  const handleStartLearning = async (personaId: string, selectedTopic: string) => {
    try {
      const result = await generateCourseWithPersona(
        personaId,
        selectedTopic,
        'intermediate',
        '4-weeks'
      );
      
      if (result && result.success && result.data) {
        setCurrentCourse(result.data);
        navigate(`/course/${result.data.id}`, {
          state: { newCourse: true }
        });
      }
    } catch (error) {
      console.error('Failed to generate course with persona:', error);
    }
  };

  if (!currentPersona) {
    return null; // Will redirect in useEffect
  }

  if (loading || !personaContent) {
    return (
      <div className="container py-12 flex items-center justify-center">
        <div className="text-center">
          <LoadingIndicator size="lg" />
          <p className="mt-4 text-muted-foreground">Loading persona content...</p>
        </div>
      </div>
    );
  }

  // Add a safety check to ensure both currentPersona and personaContent are valid
  if (!currentPersona.name || !personaContent.content) {
    return (
      <div className="container py-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Invalid persona or content data</p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/persona')}
            className="mt-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Selection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={() => navigate('/persona')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Selection
        </Button>
      </div>

      <PersonaDetail
        persona={currentPersona}
        content={personaContent}
        onUpdatePersona={handleUpdatePersona}
        onStartLearning={handleStartLearning}
        isLoading={isGenerating}
        topic={topic}
      />
    </div>
  );
};

export default PersonaDetailPage; 