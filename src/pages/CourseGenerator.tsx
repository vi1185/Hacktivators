
import React from 'react';
import { ArrowLeft, BookOpen, GraduationCap, LightbulbIcon, Atom } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import GenerationForm from '@/components/GenerationForm';

const CourseGenerator = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        title="Create New Course" 
        subtitle="Generate a comprehensive course structure with AI" 
        backLink="/"
        backLabel="Back to Home"
      />
      
      <main className="flex-grow py-10 bg-gradient-to-br from-background to-muted/30">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 gap-10">
            {/* Left column - Form */}
            <div className="order-2 md:order-1">
              <GenerationForm />
            </div>
            
            {/* Right column - Info */}
            <div className="order-1 md:order-2 flex flex-col justify-center">
              <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/60 p-6 shadow-sm">
                <h2 className="text-2xl font-medium mb-4 flex items-center gap-2">
                  <LightbulbIcon className="h-6 w-6 text-primary" />
                  <span>How It Works</span>
                </h2>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">1</div>
                    <div>
                      <h3 className="font-medium">Describe Your Course</h3>
                      <p className="text-muted-foreground text-sm">Enter a topic, select difficulty level and duration</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">2</div>
                    <div>
                      <h3 className="font-medium">AI Creates Structure</h3>
                      <p className="text-muted-foreground text-sm">Our AI generates modules, lessons, and learning objectives</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">3</div>
                    <div>
                      <h3 className="font-medium">Refine Content</h3>
                      <p className="text-muted-foreground text-sm">Review and customize the generated course structure</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-muted/50 rounded-md border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Did you know?</h4>
                      <p className="text-sm text-muted-foreground">
                        The AI model is trained on educational best practices to create structured 
                        learning experiences with clear progression and learning objectives.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-center">
                  <div className="relative">
                    <div className="absolute -top-4 -left-4 w-28 h-28 bg-primary/5 rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-4 -right-4 w-28 h-28 bg-primary/5 rounded-full blur-2xl"></div>
                    <Atom className="h-20 w-20 text-primary/40 animate-pulse-subtle" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseGenerator;
