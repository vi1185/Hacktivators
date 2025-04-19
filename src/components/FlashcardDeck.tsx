import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { Flashcard } from '@/types/course';

export interface FlashcardDeckProps {
  cards: Flashcard[];
  onComplete?: () => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ cards, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);

  useEffect(() => {
    setShuffledCards([...cards].sort(() => Math.random() - 0.5));
  }, [cards]);

  const handleNext = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else if (onComplete) {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    setShuffledCards([...shuffledCards].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  if (shuffledCards.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No flashcards available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShuffle}
        >
          <Shuffle className="h-4 w-4 mr-2" />
          Shuffle
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentIndex === shuffledCards.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <Card
        className={`relative h-64 cursor-pointer transition-transform duration-500 transform-gpu ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`absolute inset-0 backface-hidden p-6 flex items-center justify-center text-center ${
          isFlipped ? 'opacity-0' : 'opacity-100'
        }`}>
          <p className="text-lg font-medium">{shuffledCards[currentIndex].front}</p>
        </div>
        <div className={`absolute inset-0 backface-hidden p-6 flex items-center justify-center text-center rotate-y-180 ${
          isFlipped ? 'opacity-100' : 'opacity-0'
        }`}>
          <p className="text-lg">{shuffledCards[currentIndex].back}</p>
        </div>
      </Card>

      <div className="flex justify-center gap-2">
        {shuffledCards.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full ${
              index === currentIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
}; 