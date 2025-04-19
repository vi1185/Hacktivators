import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { useCourseContext } from '@/context/CourseContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import type { Course } from '@/types/course';

interface CalendarEvent {
  date: Date;
  type: 'module-start' | 'module-end' | 'lesson' | 'session';
  title: string;
  moduleId?: string;
  lessonId?: string;
  sessionId?: string;
  day?: number;
}

interface DayContentProps {
  date: Date;
  displayMonth: Date;
  children?: React.ReactNode;
}

const CourseCalendar = ({ courseId }: { courseId: string }) => {
  const { courses } = useCourseContext();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateEvents, setDateEvents] = useState<CalendarEvent[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [view, setView] = useState<'calendar' | 'timeline'>('calendar');
  
  const course = courses.find(c => c.id === courseId);
  
  useEffect(() => {
    if (!course) return;
    
    generateCourseCalendarEvents(course);
  }, [course]);
  
  useEffect(() => {
    if (selectedDate && events.length > 0) {
      const eventsOnSelectedDate = events.filter(event => 
        isSameDay(event.date, selectedDate)
      );
      setDateEvents(eventsOnSelectedDate);
    } else {
      setDateEvents([]);
    }
  }, [selectedDate, events]);
  
  const generateCourseCalendarEvents = (course: Course) => {
    const newEvents: CalendarEvent[] = [];
    const courseStartDate = new Date();
    let currentDate = startOfDay(courseStartDate);
    setStartDate(currentDate);
    
    course.modules.forEach(module => {
      newEvents.push({
        date: new Date(currentDate),
        type: 'module-start',
        title: `Start: ${module.name}`,
        moduleId: module.id
      });
      
      const totalLessonCount = module.lessons.length || 1;
      const daysPerLesson = Math.max(1, Math.floor(module.duration / totalLessonCount));
      
      module.lessons.forEach(lesson => {
        lesson.sessions.forEach(session => {
          newEvents.push({
            date: new Date(currentDate),
            type: 'session',
            title: `Day ${session.day}: ${session.title}`,
            moduleId: module.id,
            lessonId: lesson.id,
            sessionId: session.id,
            day: session.day
          });
          
          currentDate = addDays(currentDate, 1);
        });
        
        if (lesson.sessions.length === 0) {
          newEvents.push({
            date: new Date(currentDate),
            type: 'lesson',
            title: lesson.title,
            moduleId: module.id,
            lessonId: lesson.id
          });
          
          currentDate = addDays(currentDate, daysPerLesson);
        }
      });
      
      newEvents.push({
        date: new Date(currentDate),
        type: 'module-end',
        title: `End: ${module.name}`,
        moduleId: module.id
      });
    });
    
    setEvents(newEvents);
  };
  
  const getEventColor = (type: string) => {
    switch (type) {
      case 'module-start':
        return 'bg-blue-500 text-white';
      case 'module-end':
        return 'bg-green-500 text-white';
      case 'lesson':
        return 'bg-purple-500 text-white';
      case 'session':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };
  
  const renderCalendarCell = (date: Date) => {
    const dayEvents = events.filter(event => isSameDay(event.date, date));
    if (dayEvents.length === 0) return null;
    
    return (
      <div className="absolute bottom-0 left-0 right-0 flex justify-center">
        <div className="flex gap-0.5 pb-1">
          {dayEvents.map((event, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 w-1.5 rounded-full ${event.type === 'module-start' ? 'bg-blue-500' : 
                event.type === 'module-end' ? 'bg-green-500' : 
                event.type === 'lesson' ? 'bg-purple-500' : 'bg-amber-500'}`}
            />
          ))}
        </div>
      </div>
    );
  };
  
  if (!course) {
    return <div>Course not found</div>;
  }
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (!selectedDate) return;
    
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Course Timeline
        </h2>
        
        <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'timeline')} className="w-auto">
          <TabsList className="grid w-[200px] grid-cols-2">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <TabsContent value="calendar" className="mt-0">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="col-span-2 border-border/50 bg-card/95 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg font-medium">
                  {selectedDate ? format(selectedDate, 'MMMM yyyy') : ''}
                </CardTitle>
                <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border w-full"
                components={{
                  DayContent: (props: DayContentProps) => (
                    <div className="relative h-full w-full">
                      {props.children}
                      {renderCalendarCell(props.date)}
                    </div>
                  )
                }}
              />
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dateEvents.length > 0 ? (
                <div className="space-y-3">
                  {dateEvents.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-2 pb-2 border-b border-border/30 last:border-0">
                      <Badge className={`${getEventColor(event.type)} mt-0.5`}>{event.type.replace('-', ' ')}</Badge>
                      <div>
                        <p className="font-medium">{event.title}</p>
                        {event.type === 'session' && (
                          <Button 
                            variant="link" 
                            className="h-auto p-0 text-primary text-sm"
                            asChild
                          >
                            <a href={`/course/${courseId}/module/${event.moduleId}/lesson/${event.lessonId}/session/${event.sessionId}`}>
                              View session details
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No learning activities scheduled for this day</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      
      <TabsContent value="timeline" className="mt-0">
        <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Full Course Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pl-8 pb-2">
              <div className="absolute top-0 bottom-0 left-4 w-px bg-border"></div>
              
              {events.map((event, idx) => (
                <div key={idx} className="mb-6 relative">
                  <div className={`absolute left-[-30px] top-0 w-4 h-4 rounded-full border-2 border-background ${
                    event.type === 'module-start' ? 'bg-blue-500' : 
                    event.type === 'module-end' ? 'bg-green-500' : 
                    event.type === 'lesson' ? 'bg-purple-500' : 'bg-amber-500'
                  }`}></div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {format(event.date, 'EEEE, MMMM d, yyyy')}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${getEventColor(event.type)}`}>
                        {event.type.replace('-', ' ')}
                      </Badge>
                      <span className="font-medium">{event.title}</span>
                    </div>
                    
                    {event.type === 'session' && (
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-primary text-sm self-start mt-1"
                        asChild
                      >
                        <a href={`/course/${courseId}/module/${event.moduleId}/lesson/${event.lessonId}/session/${event.sessionId}`}>
                          View session details
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </div>
  );
};

export default CourseCalendar;
