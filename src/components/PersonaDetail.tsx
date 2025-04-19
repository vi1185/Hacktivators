import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Persona, PersonaContent } from '@/types/persona';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import LoadingIndicator from '@/components/LoadingIndicator';
import { UserCircle2, Book, Medal, MessageSquare, PencilLine, Send, GraduationCap, Heart, Brain, Clock, BookOpen, Check, LightbulbIcon, Lightbulb, Sparkles } from 'lucide-react';

interface PersonaDetailProps {
  persona: Persona;
  content: PersonaContent;
  onUpdatePersona: (personaId: string, changes: string) => Promise<void>;
  onStartLearning: (personaId: string, topic: string) => Promise<void>;
  isLoading: boolean;
  topic: string;
}

const PersonaDetail: React.FC<PersonaDetailProps> = ({
  persona,
  content,
  onUpdatePersona,
  onStartLearning,
  isLoading,
  topic
}) => {
  const [changes, setChanges] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleUpdatePersona = async () => {
    if (!changes.trim()) return;
    
    setUpdating(true);
    try {
      await onUpdatePersona(persona.id, changes);
      setChanges('');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left side - Content */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{content.title}</CardTitle>
            <CardDescription>
              Presented by {persona.name}, your {persona.role}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {content && content.content ? (
                <>
                  {content.content.split('\n\n').map((paragraph, index) => {
                    // Check if paragraph is a heading (starts with # or ##)
                    if (paragraph.startsWith('# ') || paragraph.startsWith('## ')) {
                      const headingText = paragraph.replace(/^#+ /, '');
                      return (
                        <h3 key={index} className="text-lg font-semibold mt-4 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          {headingText}
                        </h3>
                      );
                    }
                    // Check if paragraph is a list item
                    else if (paragraph.startsWith('- ') || paragraph.match(/^\d+\./)) {
                      return (
                        <div key={index} className="flex items-start gap-2 my-1">
                          <Check className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                          <p className="m-0">{paragraph.replace(/^-\s+|^\d+\.\s+/, '')}</p>
                        </div>
                      );
                    }
                    // Check if it's a tip or important note
                    else if (paragraph.includes('TIP:') || paragraph.includes('NOTE:') || paragraph.includes('IMPORTANT:')) {
                      return (
                        <div key={index} className="bg-muted p-3 rounded-md my-3 flex items-start gap-2">
                          <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="m-0">{paragraph}</p>
                        </div>
                      );
                    }
                    // Regular paragraph
                    else {
                      return <p key={index} className="my-2">{paragraph}</p>;
                    }
                  })}
                </>
              ) : (
                <p>No content available.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Customize Your Learning Experience</CardTitle>
            <CardDescription>
              Not satisfied with some aspects of this persona? Let us know what you'd like to change.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="Describe what you'd like to change about this persona. For example: 'Make the tone more casual' or 'Focus more on practical examples instead of theory.'"
              className="min-h-[120px]"
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleUpdatePersona}
              disabled={updating || !changes.trim()}
              className="gap-2"
            >
              {updating ? (
                <>
                  <LoadingIndicator size="sm" />
                  Updating...
                </>
              ) : (
                <>
                  <PencilLine className="w-4 h-4" />
                  Update Persona
                </>
              )}
            </Button>
            <Button
              onClick={() => onStartLearning(persona.id, topic)}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <LoadingIndicator size="sm" />
                  Creating Course...
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  Start Learning with {persona.name}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Right side - Persona Details */}
      <div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {persona.imageUrl ? (
                <img 
                  src={persona.imageUrl} 
                  alt={persona.name} 
                  className="w-16 h-16 rounded-full object-cover" 
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                  <UserCircle2 className="w-10 h-10 text-secondary-foreground" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl">{persona.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4" />
                  {persona.role.charAt(0).toUpperCase() + persona.role.slice(1)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{persona.description}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Specialties</h3>
              <div className="flex flex-wrap gap-1">
                {persona.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Book className="w-4 h-4" />
                  Teaching Style
                </h3>
                <p className="text-sm">{persona.teachingStyle}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Communication Tone
                </h3>
                <p className="text-sm">{persona.tone}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Background
                </h3>
                <p className="text-sm">{persona.background}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Medal className="w-4 h-4" />
                Supporting Qualities
              </h3>
              <ul className="text-sm space-y-1">
                {persona.supportingQualities.map((quality, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>{quality}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Characteristics
              </h3>
              <ul className="text-sm space-y-1">
                {persona.characteristics.slice(0, 5).map((characteristic, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>{characteristic}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PersonaDetail; 