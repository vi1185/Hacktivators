import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import '../styles/flashcards.css';

interface FlashcardProps {
  front: string;
  back: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export const Flashcard: React.FC<FlashcardProps> = ({
  front,
  back,
  tags = [],
  difficulty = 'medium',
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="perspective-1000 w-full h-64">
      <div
        className={`card w-full h-full cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front of card */}
        <div className="card-content absolute w-full h-full backface-hidden">
          <Card className="w-full h-full p-6 flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="text-lg font-medium">{front}</div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span
                className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(
                  difficulty
                )}`}
              >
                {difficulty}
              </span>
              <Button variant="ghost" size="sm">
                Click to flip
              </Button>
            </div>
          </Card>
        </div>

        {/* Back of card */}
        <div className="card-content absolute w-full h-full backface-hidden rotate-y-180">
          <Card className="w-full h-full p-6 flex flex-col justify-between">
            <div className="text-lg">{back}</div>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm">
                Click to flip back
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}; 