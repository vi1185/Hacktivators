
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, BarChart, BookOpen, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Course } from '@/types/course';

interface CourseCardProps {
  course: Course;
  compact?: boolean;
  className?: string;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, compact = false, className }) => {
  // Calculate progress
  const progress = course.progress ?? 
    Math.floor(
      (course.modules.filter(m => m.completed).length / Math.max(1, course.modules.length)) * 100
    );
  
  // Format dates
  const createdDate = new Date(course.createdAt);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric', 
    year: 'numeric'
  }).format(createdDate);

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-300 hover:shadow-md",
        "bg-card/95 backdrop-blur-sm border-border/50",
        compact ? "flex flex-col sm:flex-row" : "",
        className
      )}
    >
      {compact ? (
        <>
          <div className="flex-grow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs font-medium">
                {course.difficulty}
              </Badge>
              <span className="text-xs text-muted-foreground">{formattedDate}</span>
            </div>
            
            <Link to={`/course/${course.id}`} className="block group">
              <h3 className="text-xl font-medium group-hover:text-primary transition-colors">
                {course.title}
              </h3>
            </Link>
            
            <div className="mt-2 flex items-center text-sm text-muted-foreground space-x-4">
              <div className="flex items-center">
                <BookOpen size={14} className="mr-1" />
                <span>{course.modules.length} Modules</span>
              </div>
              <div className="flex items-center">
                <Calendar size={14} className="mr-1" />
                <span>{course.duration}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 border-t sm:border-t-0 sm:border-l border-border/50 sm:w-48 bg-muted/30">
            <div className="flex-grow mr-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium">Progress</span>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
            
            <Link to={`/course/${course.id}`}>
              <Button size="icon" variant="ghost" className="rounded-full">
                <ChevronRight size={18} />
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="outline">{course.difficulty}</Badge>
              <span className="text-xs text-muted-foreground">{formattedDate}</span>
            </div>
            <CardTitle className="text-2xl">{course.title}</CardTitle>
            <CardDescription className="line-clamp-2">{course.description}</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 text-sm mb-6">
              <div className="flex items-center text-muted-foreground">
                <BookOpen size={16} className="mr-1.5" />
                <span>{course.modules.length} Modules</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Clock size={16} className="mr-1.5" />
                <span>{course.duration}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <BarChart size={16} className="mr-1.5" />
                <span>{course.difficulty}</span>
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
          
          <CardFooter className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="flex flex-wrap gap-2">
              {course.modules.slice(0, 3).map((module, index) => (
                <Badge key={index} variant="secondary" className="font-normal">
                  {module.name}
                </Badge>
              ))}
              {course.modules.length > 3 && (
                <Badge variant="secondary" className="font-normal">
                  +{course.modules.length - 3} more
                </Badge>
              )}
            </div>
            
            <Link to={`/course/${course.id}`}>
              <Button size="sm">View Course</Button>
            </Link>
          </CardFooter>
        </>
      )}
    </Card>
  );
};

export default CourseCard;
