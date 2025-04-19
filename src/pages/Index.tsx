import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, GraduationCap, LayoutDashboard, Lightbulb, MoreHorizontal, PenTool, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import CourseCard from '@/components/CourseCard';
import { useCourseContext } from '@/context/CourseContext';
import { cn } from '@/lib/utils';

const Index = () => {
  const { courses } = useCourseContext();
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const features = [
    {
      icon: <Lightbulb className="h-5 w-5" />,
      title: 'AI-Powered Course Generation',
      description: 'Create comprehensive courses with just a few clicks using advanced AI technology'
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: 'Learning Personas',
      description: 'Choose or create personalized teaching personas to match your unique learning style'
    },
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      title: 'Structured Learning Paths',
      description: 'Well-organized modules, lessons, and daily sessions for effective learning progression'
    },
    {
      icon: <PenTool className="h-5 w-5" />,
      title: 'Customizable Content',
      description: 'Refine and adapt AI-generated content to match your specific requirements'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 border-b border-border/50">
          <div className="container-wide py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <div 
                className={cn(
                  "transition-all duration-1000 ease-out transform",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
              >
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
                  Design Custom Courses with AI
                </h1>
                
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Create comprehensive, structured learning experiences in seconds. 
                  AI Course Architect generates detailed modules, lessons, and daily sessions.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/create">
                    <Button size="lg" className="w-full sm:w-auto">
                      Create a Course
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  
                  <Link to="/persona">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      Try Learning Personas
                      <Users className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  
                  <Link to="/courses">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      Browse My Courses
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Background elements */}
          <div className="absolute top-20 left-10 w-20 h-20 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
        </section>
        
        {/* Features Section */}
        <section className="py-16 md:py-24">
          <div className="container-wide">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tight mb-4">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our AI-powered platform simplifies course creation while maintaining pedagogical excellence
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, i) => (
                <div 
                  key={i}
                  className={cn(
                    "bg-card border border-border/30 rounded-lg p-6 shadow-sm",
                    "transition-all duration-500 ease-out transform",
                    "hover:border-primary/20 hover:shadow-md",
                    isVisible 
                      ? "opacity-100 translate-y-0" 
                      : "opacity-0 translate-y-8"
                  )}
                  style={{ transitionDelay: `${150 * i}ms` }}
                >
                  <div className="p-2 bg-primary/10 rounded-lg w-10 h-10 flex items-center justify-center text-primary mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Recent Courses Section */}
        {courses.length > 0 && (
          <section className="py-16 md:py-20 bg-muted/30 border-y border-border/50">
            <div className="container-wide">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Your Recent Courses</h2>
                  <p className="text-muted-foreground mt-1">Continue where you left off</p>
                </div>
                
                <Link to="/courses">
                  <Button variant="outline" className="group">
                    <span>View All</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {courses.slice(0, 4).map((course, i) => (
                  <CourseCard key={i} course={course} compact />
                ))}
              </div>
            </div>
          </section>
        )}
        
        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="container-wide">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Ready to Create Your First Course?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Design curriculum in minutes that would take weeks to create manually.
                Let AI do the heavy lifting while you focus on the content.
              </p>
              
              <Link to="/create">
                <Button size="lg" className="group">
                  Start Creating Now
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* New Personalized Learning Section */}
        <section className="py-16 md:py-20 bg-muted/10 border-y border-border/50">
          <div className="container-wide">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">Personalized Learning Experience</h2>
                <p className="text-muted-foreground mb-6">
                  Meet your new AI learning companions! Our innovative persona system creates customized teaching styles that adapt to your unique learning preferences.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <div className="min-w-5 pt-1">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <p>Choose from a variety of teaching personas or create your own</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="min-w-5 pt-1">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <p>Customize teaching style, tone, and approach to match your preferences</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="min-w-5 pt-1">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <p>Generate courses tailored to your specific learning profile</p>
                  </li>
                </ul>
                <Link to="/persona">
                  <Button className="group">
                    Explore Learning Personas
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
              <div className="bg-card rounded-lg border border-border/50 shadow-sm p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted rounded-lg p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium mb-1">Professor Style</h3>
                    <p className="text-sm text-muted-foreground">Structured, detailed, and academic approach</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium mb-1">Coach Style</h3>
                    <p className="text-sm text-muted-foreground">Motivational, practical, and results-oriented</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium mb-1">Guide Style</h3>
                    <p className="text-sm text-muted-foreground">Supportive, step-by-step, and beginner-friendly</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium mb-1">Custom Style</h3>
                    <p className="text-sm text-muted-foreground">Tailored exactly to your preferences and needs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border/50 py-8">
        <div className="container-wide">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <BookOpen className="mr-2 h-5 w-5 text-primary" />
              <span className="font-medium">AI Course Architect</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} AI Course Architect. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
