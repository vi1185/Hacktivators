
import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Module } from '@/types/course';

interface ModuleCardProps {
  module: Module;
  courseId: string;
  index: number;
  onClick?: () => void;
  className?: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ 
  module, 
  courseId, 
  index, 
  onClick,
  className 
}) => {
  // Calculate module progress
  const progress = module.progress ?? 
    Math.floor(
      (module.lessons.filter(l => l.completed).length / Math.max(1, module.lessons.length)) * 100
    );
  
  // Generate placeholder lessons if none exist
  const hasLessons = module.lessons && module.lessons.length > 0;
  
  return (
    <Card 
      className={cn(
        "overflow-hidden group transition-all duration-300 hover:shadow-md",
        "border-border/50 bg-card/95 backdrop-blur-sm",
        className
      )}
    >
      <CardHeader className="pb-2">
        <Badge variant="outline" className="self-start mb-2">Module {index + 1}</Badge>
        <h3 className="text-xl font-medium">{module.name}</h3>
      </CardHeader>
      
      <CardContent>
        <p className="text-muted-foreground mb-4 line-clamp-2">{module.description}</p>
        
        <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
          <div className="flex items-center text-muted-foreground">
            <Clock size={16} className="mr-1.5" />
            <span>{module.duration} days</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <BookOpen size={16} className="mr-1.5" />
            <span>{hasLessons ? module.lessons.length : 0} Lessons</span>
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
        {hasLessons ? (
          <div className="flex flex-wrap gap-1.5">
            {module.lessons.slice(0, 2).map((lesson, i) => (
              <Badge key={i} variant="secondary" className="font-normal">
                {lesson.title}
              </Badge>
            ))}
            {module.lessons.length > 2 && (
              <Badge variant="secondary" className="font-normal">
                +{module.lessons.length - 2} more
              </Badge>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No lessons yet
          </div>
        )}
        
        <Link 
          to={`/course/${courseId}/module/${module.id}`}
          onClick={onClick}
        >
          <Button className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <span className="mr-1">{hasLessons ? 'View' : 'Generate'} Lessons</span>
            <ChevronRight size={16} />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ModuleCard;
