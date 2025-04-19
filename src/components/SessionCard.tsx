
import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Target, FileText, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Session } from '@/types/course';

interface SessionCardProps {
  session: Session;
  lessonId: string;
  moduleId: string;
  courseId: string;
  onClick?: () => void;
  className?: string;
}

const SessionCard: React.FC<SessionCardProps> = ({ 
  session, 
  lessonId, 
  moduleId, 
  courseId, 
  onClick,
  className 
}) => {
  const hasSections = session.sections && session.sections.length > 0;
  
  return (
    <Card 
      className={cn(
        "overflow-hidden group transition-all duration-300 hover:shadow-md",
        "border-border/50 bg-card/95 backdrop-blur-sm",
        session.completed ? "border-primary/20 bg-primary/5" : "",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <Badge variant="outline" className="self-start">
            Day {session.day}
          </Badge>
          {session.completed && (
            <Badge className="bg-primary/15 text-primary border-primary/20 flex items-center gap-1">
              <Check size={12} />
              <span>Completed</span>
            </Badge>
          )}
        </div>
        <h3 className="text-xl font-medium">{session.title}</h3>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
          <div className="flex items-center text-muted-foreground">
            <Clock size={16} className="mr-1.5" />
            <span>{session.duration}</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <Target size={16} className="mr-1.5" />
            <span>{session.objectives.length} Objectives</span>
          </div>
          {hasSections && (
            <div className="flex items-center text-muted-foreground">
              <FileText size={16} className="mr-1.5" />
              <span>{session.sections.length} Sections</span>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1.5">Objectives</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {session.objectives.slice(0, 2).map((objective, i) => (
                <li key={i} className="line-clamp-1">• {objective}</li>
              ))}
              {session.objectives.length > 2 && (
                <li className="text-muted-foreground/80">
                  +{session.objectives.length - 2} more objectives
                </li>
              )}
            </ul>
          </div>
          
          {session.activities && session.activities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1.5">Activities</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {session.activities.slice(0, 2).map((activity, i) => (
                  <li key={i} className="line-clamp-1">• {activity}</li>
                ))}
                {session.activities.length > 2 && (
                  <li className="text-muted-foreground/80">
                    +{session.activities.length - 2} more activities
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between pt-3 border-t border-border/40">
        {hasSections ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Content sections ready</span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Generate detailed content
          </div>
        )}
        
        <Link 
          to={`/course/${courseId}/module/${moduleId}/lesson/${lessonId}/session/${session.id}`}
          onClick={onClick}
        >
          <Button className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <span className="mr-1">{hasSections ? 'View' : 'Generate'} Content</span>
            <ChevronRight size={16} />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default SessionCard;
