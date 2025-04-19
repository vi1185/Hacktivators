
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const GenerationForm = () => {
  const navigate = useNavigate();
  
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [duration, setDuration] = useState<'2-weeks' | '4-weeks' | '8-weeks' | '12-weeks'>('4-weeks');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!topic.trim()) {
      setFormError('Please enter a course topic');
      return;
    }
    
    setFormError('');
    
    // Navigate to the assessment quiz with the form data
    navigate('/assessment', { 
      state: { 
        topic: topic.trim(),
        difficulty,
        duration
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6 p-6 bg-card rounded-lg border border-border/50 shadow-sm">
      <div>
        <h2 className="text-xl sm:text-2xl font-medium">Create a New AI Course</h2>
        <p className="text-muted-foreground mt-1">
          AI will generate a personalized course curriculum based on your specifications and learning preferences
        </p>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="topic" className="block text-sm font-medium">
            Course Topic
          </label>
          <Input
            id="topic"
            placeholder="e.g., Machine Learning, Web Development, Digital Marketing"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="difficulty" className="block text-sm font-medium">
            Difficulty Level
          </label>
          <Select
            value={difficulty}
            onValueChange={(value) => setDifficulty(value as any)}
          >
            <SelectTrigger id="difficulty" className="w-full">
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="duration" className="block text-sm font-medium">
            Course Duration
          </label>
          <Select
            value={duration}
            onValueChange={(value) => setDuration(value as any)}
          >
            <SelectTrigger id="duration" className="w-full">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2-weeks">2 Weeks</SelectItem>
              <SelectItem value="4-weeks">4 Weeks</SelectItem>
              <SelectItem value="8-weeks">8 Weeks</SelectItem>
              <SelectItem value="12-weeks">12 Weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {formError && (
        <div className="text-destructive text-sm">{formError}</div>
      )}
      
      <div className="pt-4">
        <Button 
          type="submit" 
          className="w-full"
          disabled={!topic.trim()}
        >
          Continue to Assessment
        </Button>
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Take a short assessment to personalize your learning experience, then AI will design your curriculum
        </p>
      </div>
    </form>
  );
};

export default GenerationForm;
