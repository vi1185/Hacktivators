import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Persona } from '@/types/persona';
import { UserCircle2, Book, Medal, Sparkles, MessageSquare } from 'lucide-react';

interface PersonaSelectionCardProps {
  persona: Persona;
  isSelected: boolean;
  onSelect: (persona: Persona) => void;
}

const PersonaSelectionCard: React.FC<PersonaSelectionCardProps> = ({ 
  persona, 
  isSelected,
  onSelect
}) => {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-2 border-primary' : ''
      }`}
      onClick={() => onSelect(persona)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {persona.imageUrl ? (
            <img 
              src={persona.imageUrl} 
              alt={persona.name} 
              className="w-12 h-12 rounded-full object-cover" 
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <UserCircle2 className="w-8 h-8 text-secondary-foreground" />
            </div>
          )}
          <div>
            <CardTitle className="text-xl">{persona.name}</CardTitle>
            <CardDescription className="text-sm font-medium">
              {persona.role.charAt(0).toUpperCase() + persona.role.slice(1)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4">{persona.description}</p>
        
        <div className="flex flex-wrap gap-1 mb-4">
          {persona.specialties.slice(0, 3).map((specialty, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {specialty}
            </Badge>
          ))}
          {persona.specialties.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{persona.specialties.length - 3} more
            </Badge>
          )}
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Book className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Teaching style:</span>
            <span>{persona.teachingStyle}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Tone:</span>
            <span>{persona.tone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Strengths:</span>
            <span>{persona.supportingQualities.slice(0, 2).join(', ')}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant={isSelected ? "default" : "outline"} 
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(persona);
          }}
        >
          {isSelected ? 'Selected' : 'Select Persona'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PersonaSelectionCard; 