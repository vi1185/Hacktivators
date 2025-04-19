import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CourseProvider } from "./context/CourseContext";
import { PersonaProvider } from "./context/PersonaContext";
import Index from "./pages/Index";
import CourseGenerator from "./pages/CourseGenerator";
import CoursesList from "./pages/CoursesList";
import CourseView from "./pages/CourseView";
import ModuleView from "./pages/ModuleView";
import LessonView from "./pages/LessonView";
import SessionView from "./pages/SessionView";
import NotFound from "./pages/NotFound";
import AssessmentQuiz from './pages/AssessmentQuiz';
import PersonaSelection from './pages/PersonaSelection';
import PersonaDetailPage from './pages/PersonaDetail';
import ChatBot from '@/components/ChatBot';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CourseProvider>
          <PersonaProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/courses" element={<CoursesList />} />
                <Route path="/create" element={<CourseGenerator />} />
                <Route path="/assessment" element={<AssessmentQuiz />} />
                <Route path="/persona" element={<PersonaSelection />} />
                <Route path="/persona/detail" element={<PersonaDetailPage />} />
                <Route path="/course/:courseId" element={<CourseView />} />
                <Route path="/course/:courseId/module/:moduleId" element={<ModuleView />} />
                <Route path="/course/:courseId/module/:moduleId/lesson/:lessonId" element={<LessonView />} />
                <Route path="/course/:courseId/module/:moduleId/lesson/:lessonId/session/:sessionId" element={<SessionView />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ChatBot />
            </BrowserRouter>
          </PersonaProvider>
        </CourseProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
