
import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, BookOpen, FileText, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Lesson } from '@/types/course';

interface LessonCardProps {
  lesson: Lesson;
  moduleId: string;
  courseId: string;
  index: number;
  onClick?: () => void;
  className?: string;
}

const LessonCard: React.FC<LessonCardProps> = ({ 
  lesson, 
  moduleId, 
  courseId, 
  index, 
  onClick,
  className 
}) => {
  const progress = lesson.progress ?? 
    Math.floor(
      (lesson.sessions.filter(s => s.completed).length / Math.max(1, lesson.sessions.length)) * 100
    );
  
  const hasSessions = lesson.sessions && lesson.sessions.length > 0;
  
  return (
    <Card 
      className={cn(
        "overflow-hidden group transition-all duration-300 hover:shadow-md",
        "border-border/50 bg-card/95 backdrop-blur-sm",
        lesson.completed ? "border-primary/20 bg-primary/5" : "",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <Badge variant="outline" className="self-start">
            Lesson {index + 1}
          </Badge>
          {lesson.completed && (
            <Badge className="bg-primary/15 text-primary border-primary/20 flex items-center gap-1">
              <Check size={12} />
              <span>Completed</span>
            </Badge>
          )}
        </div>
        <h3 className="text-xl font-medium">{lesson.title}</h3>
      </CardHeader>
      
      <CardContent>
        <p className="text-muted-foreground mb-4 line-clamp-2">
          {lesson.content.split('.')[0]}...
        </p>
        
        <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
          <div className="flex items-center text-muted-foreground">
            <Clock size={16} className="mr-1.5" />
            <span>{lesson.duration} days</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <FileText size={16} className="mr-1.5" />
            <span>{lesson.exercises.length} Exercises</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <BookOpen size={16} className="mr-1.5" />
            <span>{hasSessions ? lesson.sessions.length : 0} Sessions</span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between pt-3 border-t border-border/40">
        {hasSessions ? (
          <div className="flex flex-wrap gap-1.5">
            {lesson.sessions.slice(0, 2).map((session, i) => (
              <Badge key={i} variant="secondary" className="font-normal">
                Day {session.day}
              </Badge>
            ))}
            {lesson.sessions.length > 2 && (
              <Badge variant="secondary" className="font-normal">
                +{lesson.sessions.length - 2} days
              </Badge>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No sessions yet
          </div>
        )}
        
        <Link 
          to={`/course/${courseId}/module/${moduleId}/lesson/${lesson.id}`}
          onClick={onClick}
        >
          <Button className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <span className="mr-1">{hasSessions ? 'View' : 'Generate'} Sessions</span>
            <ChevronRight size={16} />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default LessonCard;
