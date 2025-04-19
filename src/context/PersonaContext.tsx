import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Persona, PersonaContent, UserProfile, PersonaGenerationResult } from '@/types/persona';
import autogenService from '@/services/autogen-service';
import { toast } from 'sonner';
import { AutogenResponse } from '@/services/autogen-service';
import { Course } from '@/types/course';

interface PersonaContextType {
  personas: Persona[];
  setPersonas: (personas: Persona[]) => void;
  currentPersona: Persona | null;
  setCurrentPersona: (persona: Persona | null) => void;
  personaContent: PersonaContent | null;
  setPersonaContent: (content: PersonaContent | null) => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  isGenerating: boolean;
  error: string | null;
  generatePersona: (userInput: string, topic: string) => Promise<void>;
  updatePersona: (personaId: string, changes: string) => Promise<void>;
  generateCourseWithPersona: (personaId: string, topic: string, difficulty: string, duration: string) => Promise<AutogenResponse<Course> | { success: boolean; error: string; data: null }>;
  clearError: () => void;
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export const PersonaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [personaContent, setPersonaContent] = useState<PersonaContent | null>({
    id: '',
    personaId: '',
    title: '',
    content: '',
    topic: '',
    type: 'introduction',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load personas from localStorage on mount
  useEffect(() => {
    const storedPersonas = localStorage.getItem('personas');
    if (storedPersonas) {
      try {
        setPersonas(JSON.parse(storedPersonas));
      } catch (error) {
        console.error('Error parsing stored personas:', error);
      }
    }
  }, []);

  // Save personas to localStorage when they change
  useEffect(() => {
    localStorage.setItem('personas', JSON.stringify(personas));
  }, [personas]);

  const clearError = () => setError(null);

  const generatePersona = async (userInput: string, topic: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await autogenService.generatePersona(userInput, topic);
      if (response.success && response.data) {
        const result = response.data as PersonaGenerationResult;
        setUserProfile(result.userProfile);
        setCurrentPersona(result.persona);
        setPersonaContent(result.initialContent);
        
        // Add to personas list
        setPersonas(prev => [...prev, result.persona]);
        
        toast.success('Persona generated successfully!');
      } else {
        throw new Error(response.error ? String(response.error) : 'Failed to generate persona');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate persona';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const updatePersona = async (personaId: string, changes: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await autogenService.updatePersona(personaId, changes);
      if (response.success && response.data) {
        const updatedPersona = response.data.persona as Persona;
        const updatedContent = response.data.content as PersonaContent;
        
        // Update current persona and content
        setCurrentPersona(updatedPersona);
        setPersonaContent(updatedContent);
        
        // Update in personas list
        setPersonas(prev => 
          prev.map(p => p.id === personaId ? updatedPersona : p)
        );
        
        toast.success('Persona updated successfully!');
      } else {
        throw new Error(response.error ? String(response.error) : 'Failed to update persona');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update persona';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCourseWithPersona = async (personaId: string, topic: string, difficulty: string, duration: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await autogenService.generateCourseWithPersona(
        personaId,
        topic,
        difficulty as "beginner" | "intermediate" | "advanced",
        duration as "2-weeks" | "4-weeks" | "8-weeks" | "12-weeks"
      );
      if (response.success && response.data) {
        toast.success('Course generated with persona successfully!');
        // The course will be handled by the CourseContext
        return response; // Return the response object
      } else {
        throw new Error(response.error ? String(response.error) : 'Failed to generate course with persona');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate course with persona';
      setError(message);
      toast.error(message);
      return { success: false, error: message, data: null }; // Return error response
    } finally {
      setIsGenerating(false);
    }
  };

  const value: PersonaContextType = {
    personas,
    setPersonas,
    currentPersona,
    setCurrentPersona,
    personaContent,
    setPersonaContent,
    userProfile,
    setUserProfile,
    isGenerating,
    error,
    generatePersona,
    updatePersona,
    generateCourseWithPersona,
    clearError
  };

  return (
    <PersonaContext.Provider value={value}>
      {children}
    </PersonaContext.Provider>
  );
};

export const usePersonaContext = () => {
  const context = useContext(PersonaContext);
  if (context === undefined) {
    throw new Error('usePersonaContext must be used within a PersonaProvider');
  }
  return context;
};

export default PersonaContext; 