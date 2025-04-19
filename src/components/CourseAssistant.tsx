import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, MessageCircle, Send, Bot, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { useCourseContext } from '@/context/CourseContext';
import LoadingIndicator from '@/components/LoadingIndicator';
import autogenService, { ChatContext } from '@/services/autogen-service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CourseAssistantProps {
  courseId?: string;
}

const CourseAssistant: React.FC<CourseAssistantProps> = ({ courseId }) => {
  const { courses, currentCourse, currentModule, currentLesson } = useCourseContext();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const course = courseId ? courses.find(c => c.id === courseId) : currentCourse;
  
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add initial greeting
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          content: course 
            ? `Hello! I\'m your learning assistant for "${course.title}". How can I help you with your course?` 
            : "Hello! I\'m your learning assistant. How can I help you today?",
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, course]);
  
  const toggleOpen = () => {
    setIsOpen(prev => !prev);
    if (!isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Prepare context information for AI
      const contextInfo = {
        courseInfo: course ? {
          title: course.title,
          description: course.description,
          difficulty: course.difficulty,
          duration: course.duration,
          modules: course.modules.length,
          prerequisites: course.prerequisites,
          learningGoals: course.learningGoals
        } : null
      };
      
      // Create a system prompt with context
      const systemPrompt = `You are a helpful learning assistant for an online course platform. ${
        course ? `The user is currently taking a course titled "${course.title}" which is a ${course.difficulty} level ${course.duration} course.` : ''
      }

The course covers the following topics:
${course?.modules.map(m => `- ${m.name}`).join('\n') || ''}

Please provide helpful, concise answers to questions about the course content, learning strategies, or technical concepts.
Keep responses friendly and supportive, focusing on helping the user understand and succeed in their learning journey.`;
      
      // Create a single ChatContext object instead of an array
      const chatContext: ChatContext = {
        courseId: course?.id || '',
        moduleId: currentModule?.id || '',
        lessonId: currentLesson?.id || '',
        sessionId: '',
        userProgress: {},
        role: 'user'
      };
      
      const response = await autogenService.getChatResponse(
        systemPrompt,
        chatContext,
        JSON.stringify(contextInfo)
      );
      
      if (response.success && response.data) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.data.text,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error?.message || "Failed to get response");
      }
    } catch (error) {
      console.error("Error getting assistant response:", error);
      
      setMessages(prev => [
        ...prev, 
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
          timestamp: new Date()
        }
      ]);
      
      toast.error("Couldn't get a response", {
        description: "There was an issue connecting to the AI service."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      {/* Floating button */}
      <Button
        onClick={toggleOpen}
        className={`rounded-full fixed bottom-6 right-6 shadow-lg ${isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary'}`}
        size="icon"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
      
      {/* Chat window */}
      <div 
        className={`fixed bottom-20 right-6 z-50 w-full sm:w-[400px] transition-all duration-300 transform ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'
        }`}
      >
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/50">
            <CardTitle className="text-base font-medium flex items-center">
              <Bot className="mr-2 h-5 w-5 text-primary" />
              {course ? `${course.title} Assistant` : 'Learning Assistant'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={toggleOpen}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[350px] p-4">
              {messages.map((message) => (
                <div key={message.id} className="mb-4">
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-lg px-3 py-2 max-w-[80%] ${
                      message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                  <div className={`text-xs text-muted-foreground mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <LoadingIndicator size="sm" label="Thinking..." />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </ScrollArea>
          </CardContent>
          
          <CardFooter className="p-4 border-t border-border/50">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                {isLoading ? <LoadingIndicator /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default CourseAssistant;
