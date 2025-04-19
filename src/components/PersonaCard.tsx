import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, MessageCircle, RefreshCw, UserPlus } from 'lucide-react';
import { usePersonaContext } from '@/context/PersonaContext';
import { useCourseContext } from '@/context/CourseContext';
import AskPersonaModal from './AskPersonaModal';
import { toast } from '@/components/ui/use-toast';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';

interface PersonaCardProps {
  viewType: 'module' | 'lesson' | 'session';
}

const PersonaCard: React.FC<PersonaCardProps> = ({ viewType }) => {
  const { currentPersona } = usePersonaContext();
  const { currentCourse, currentModule, currentLesson, currentSession } = useCourseContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);
  const [showChangeContentModal, setShowChangeContentModal] = useState(false);
  const [changeRequest, setChangeRequest] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentPersona) return null;

  const handleAskPersona = () => {
    setShowAskModal(true);
    setIsOpen(false);
  };

  const handleChangeContent = () => {
    // Open the change content modal instead of navigating
    setShowChangeContentModal(true);
    setIsOpen(false);
  };

  const handleSubmitChangeRequest = async () => {
    if (!changeRequest.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare a prompt that provides context about what the user wants to change
      const contextMessage = `I'd like to request a change to the current ${viewType}: `;
      const contentInfo = {
        course: currentCourse?.title || 'N/A',
        module: currentModule?.title || 'N/A',
        lesson: currentLesson?.title || 'N/A',
        session: currentSession?.title || 'N/A'
      };
      
      // Here you would call the backend service to process the change request
      // This is a placeholder for the actual implementation
      
      // For now, just show a success toast after a delay to simulate processing
      setTimeout(() => {
        toast({
          title: "Change request submitted",
          description: "Your teaching persona is reviewing your request to adapt the content.",
        });
        
        setIsSubmitting(false);
        setShowChangeContentModal(false);
        setChangeRequest('');
      }, 1500);
    } catch (error) {
      console.error('Error submitting change request:', error);
      toast({
        title: "Error",
        description: "Could not submit your change request",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  const handleChangePersona = () => {
    // Save current location in state to return after persona selection
    navigate('/persona', { 
      state: { 
        returnPath: location.pathname,
        courseId: currentCourse?.id,
        moduleId: currentModule?.id,
        lessonId: currentLesson?.id,
        sessionId: currentSession?.id,
        viewType: viewType,
        fromContentView: true
      }
    });
    
    toast.info("Select a different teaching persona", {
      description: "Your course content will be adapted to the new persona's teaching style"
    });
  };

  // Generate initials from persona name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Determine the change content button text based on viewType
  const getChangeContentText = () => {
    switch (viewType) {
      case 'module':
        return 'Change Module';
      case 'lesson':
        return 'Change Lesson';
      case 'session':
        return 'Change Session';
    }
  };

  // Prepare course context for the AskPersonaModal
  const courseContext = {
    courseId: currentCourse?.id,
    moduleId: currentModule?.id,
    lessonId: currentLesson?.id,
    sessionId: currentSession?.id
  };

  return (
    <>
      <Card className="w-64 shadow-md border-border/50 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Avatar>
              <AvatarImage src={currentPersona.avatarUrl} alt={currentPersona.name} />
              <AvatarFallback>{getInitials(currentPersona.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium truncate">{currentPersona.name}</h4>
              <p className="text-xs text-muted-foreground truncate">{currentPersona.role || 'Learning Guide'}</p>
            </div>
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleAskPersona}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Ask {currentPersona.name}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleChangeContent}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {getChangeContentText()}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleChangePersona}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Change Persona
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {currentPersona.description || 'Your personalized learning companion'}
          </p>
        </CardContent>
      </Card>

      {/* Ask Persona Modal */}
      <AskPersonaModal
        open={showAskModal}
        onOpenChange={setShowAskModal}
        personaId={currentPersona.id}
        personaName={currentPersona.name}
        personaRole={currentPersona.role || 'Learning Guide'}
        avatarUrl={currentPersona.avatarUrl}
        courseContext={courseContext}
      />

      {/* Change Content Request Modal */}
      <Dialog open={showChangeContentModal} onOpenChange={setShowChangeContentModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Content Changes</DialogTitle>
            <DialogDescription>
              Tell {currentPersona.name} how you'd like to adapt the current {viewType}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm mb-2">Current context:</p>
            <div className="bg-muted p-3 rounded-md text-sm mb-4">
              <p><strong>Course:</strong> {currentCourse?.title || 'N/A'}</p>
              <p><strong>Module:</strong> {currentModule?.title || 'N/A'}</p>
              {viewType !== 'module' && <p><strong>Lesson:</strong> {currentLesson?.title || 'N/A'}</p>}
              {viewType === 'session' && <p><strong>Session:</strong> {currentSession?.title || 'N/A'}</p>}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="change-request" className="text-sm font-medium">
                What would you like to change?
              </label>
              <Textarea
                id="change-request"
                placeholder="e.g., 'Make this content more practical with real-world examples' or 'Simplify the explanation of this concept'"
                value={changeRequest}
                onChange={(e) => setChangeRequest(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={handleSubmitChangeRequest} disabled={!changeRequest.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PersonaCard; 