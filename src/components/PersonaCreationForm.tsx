import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoadingIndicator from '@/components/LoadingIndicator';
import { UserSquare, Sparkles, Flag, BrainCircuit, Clock, BookOpen } from 'lucide-react';

interface PersonaCreationFormProps {
  onSubmit: (userInput: string, topic: string) => Promise<void>;
  isLoading: boolean;
  topic: string;
  setTopic: (topic: string) => void;
}

const PersonaCreationForm: React.FC<PersonaCreationFormProps> = ({
  onSubmit,
  isLoading,
  topic,
  setTopic
}) => {
  const [userInput, setUserInput] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() && topic.trim()) {
      onSubmit(userInput, topic);
    }
  };

  // Example prompts to help users
  const examplePrompts = [
    "I'm a visual learner who likes practical examples. I want to master topics deeply and prefer hands-on learning over theory. I work best with structured, step-by-step guidance.",
    "I'm interested in quick learning and practical applications. I have limited time and want to focus on the most important aspects. I enjoy interactive challenges.",
    "I learn best through storytelling and real-world examples. I need help staying motivated and prefer a supportive teaching style with frequent encouragement."
  ];

  const handleUseExample = (example: string) => {
    setUserInput(example);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Create Your Learning Persona</CardTitle>
        <CardDescription>
          Tell us about yourself and your learning preferences to create a personalized learning experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="topic">What topic do you want to learn?</Label>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Machine Learning, Web Development, Creative Writing"
                className="flex-1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-input">Tell us about yourself</Label>
            <div className="flex flex-col space-y-1">
              <div className="grid grid-cols-1 md:g rid-cols-3 gap-2 mb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flag className="w-4 h-4" />
                  <span>Your learning goals</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BrainCircuit className="w-4 h-4" />
                  <span>Learning style & strengths</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Time availability</span>
                </div>
              </div>
              <Textarea
                id="user-input"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Describe your learning goals, preferences, strengths, how you like to study, what content types you prefer, and your time availability."
                className="min-h-[150px]"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Examples (click to use)</Label>
            <div className="grid grid-cols-1 gap-2">
              {examplePrompts.map((prompt, index) => (
                <Button 
                  key={index} 
                  type="button" 
                  variant="outline" 
                  className="justify-start h-auto py-2 px-3 text-left text-sm font-normal"
                  onClick={() => handleUseExample(prompt)}
                >
                  <span className="line-clamp-2">{prompt}</span>
                </Button>
              ))}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          type="submit" 
          onClick={handleSubmit} 
          disabled={!userInput.trim() || !topic.trim() || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <LoadingIndicator size="sm" />
              Generating Persona...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Persona
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PersonaCreationForm; 