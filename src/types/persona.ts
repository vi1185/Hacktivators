import { Course } from './course';

export interface UserProfile {
  id: string;
  goals: string[];
  learningStyle: string;
  strengths: string[];
  weaknesses: string[];
  contentPreferences: string[];
  timeAvailability: string;
  background: string;
  interests: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  role: 'mentor' | 'teacher' | 'coach' | 'guide' | 'expert';
  specialties: string[];
  teachingStyle: string;
  tone: string;
  background: string;
  characteristics: string[];
  supportingQualities: string[];
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  userProfileId: string;
}

export interface PersonaContent {
  id: string;
  personaId: string;
  title: string;
  content: string;
  topic: string;
  type: 'summary' | 'introduction' | 'explanation';
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileInput {
  goals: string;
  learningStyle: string;
  strengths: string;
  weaknesses: string;
  contentPreferences: string;
  timeAvailability: string;
  background: string;
  interests: string;
}

export interface PersonaWithContent {
  persona: Persona;
  content: PersonaContent;
}

export interface PersonaGenerationResult {
  userProfile: UserProfile;
  persona: Persona;
  initialContent: PersonaContent;
}

export interface PersonaUpdateInput {
  personaId: string;
  changes: string;
} 