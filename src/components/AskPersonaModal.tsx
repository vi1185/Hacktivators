import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import autogenService from '@/services/autogen-service';
import { ChatMessage } from '@/services/autogen-service';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'persona';
  timestamp: number;
}

interface AskPersonaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personaId: string;
  personaName: string;
  personaRole?: string;
  avatarUrl?: string;
  courseContext?: {
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
    sessionId?: string;
  };
}

const AskPersonaModal: React.FC<AskPersonaModalProps> = ({
  open,
  onOpenChange,
  personaId,
  personaName,
  personaRole = 'Learning Guide',
  avatarUrl,
  courseContext
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: `Hello! I'm ${personaName}, your ${personaRole.toLowerCase()}. How can I help you with your learning journey today?`,
      sender: 'persona',
      timestamp: Date.now()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generate initials from persona name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    // Add user message to the conversation
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: userInput,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      // Prepare chat history for API
      const chatHistory: ChatMessage[] = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      // Call the backend service to get the persona's response
      const response = await autogenService.chatWithPersona(
        personaId,
        userInput,
        chatHistory,
        courseContext
      );

      if (response.success && response.data) {
        // Add persona's response to the conversation
        const personaMessage: Message = {
          id: `persona_${Date.now()}`,
          content: response.data.response,
          sender: 'persona',
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, personaMessage]);
      } else {
        // Handle error
        toast({
          title: "Failed to get response",
          description: response.error?.message || "Please try again later",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in chat with persona:', error);
      toast({
        title: "Error",
        description: "Could not communicate with the learning assistant",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] md:max-w-[700px] h-[600px] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl} alt={personaName} />
              <AvatarFallback>{getInitials(personaName)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{personaName}</DialogTitle>
              <DialogDescription>{personaRole}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-grow my-4 border rounded-md p-4 bg-muted/30">
          <div className="space-y-4">
            {messages.map(message => (
              <div 
                key={message.id} 
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-muted flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex gap-2">
          <Textarea 
            placeholder="Ask a question..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading) handleSendMessage();
              }
            }}
            disabled={isLoading}
            className="flex-grow"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !userInput.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AskPersonaModal; 