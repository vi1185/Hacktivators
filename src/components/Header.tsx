import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ChevronRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCourseContext } from '@/context/CourseContext';
import { usePersonaContext } from '@/context/PersonaContext';
import PersonaCard from './PersonaCard';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  backLink?: string;
  backLabel?: string;
  viewType?: 'module' | 'lesson' | 'session';
}

interface BreadcrumbItemProps {
  item: { label: string; link: string };
  index: number;
  isLast: boolean;
}

const BreadcrumbItem = ({ item, index, isLast }: BreadcrumbItemProps) => (
  <>
    {index > 0 && <ChevronRight size={14} className="mx-1 flex-shrink-0" />}
    <Link 
      to={item.link}
      data-lov-id={`breadcrumb-${index}`}
      className={cn(
        "truncate max-w-[150px] transition-colors hover:text-foreground",
        isLast ? "text-foreground font-medium" : ""
      )}
    >
      {item.label}
    </Link>
  </>
);

const Header = ({ title, subtitle, backLink, backLabel, viewType }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { currentCourse, currentModule, currentLesson } = useCourseContext();
  const { currentPersona } = usePersonaContext();

  // Build breadcrumb items
  const breadcrumbs = React.useMemo(() => {
    const items = [];

    // Always start with home
    items.push({ label: 'Home', link: '/' });

    if (currentCourse) {
      items.push({ 
        label: currentCourse.title, 
        link: `/course/${currentCourse.id}` 
      });

      if (currentModule) {
        items.push({ 
          label: currentModule.name, 
          link: `/course/${currentCourse.id}/module/${currentModule.id}` 
        });

        if (currentLesson) {
          items.push({ 
            label: currentLesson.title, 
            link: `/course/${currentCourse.id}/module/${currentModule.id}/lesson/${currentLesson.id}` 
          });
        }
      }
    }

    return items;
  }, [currentCourse, currentModule, currentLesson]);

  return (
    <header className="w-full border-b border-border/80">
      <div className="container-wide py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link 
            to="/" 
            className="mr-4 text-xl font-semibold tracking-tight flex items-center transition-opacity hover:opacity-80"
          >
            <span className="bg-primary text-primary-foreground rounded-lg p-1.5 mr-2">
              <Home size={20} />
            </span>
            <span className="hidden sm:inline-block">AI Course Architect</span>
          </Link>

          {/* Desktop Breadcrumbs */}
          <nav className="hidden md:flex items-center text-sm text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <BreadcrumbItem
                key={index}
                item={item}
                index={index}
                isLast={index === breadcrumbs.length - 1}
              />
            ))}
          </nav>
        </div>

        {/* Mobile Menu Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          {/* Persona Card */}
          {currentPersona && viewType && (
            <div className="mr-4">
              <PersonaCard viewType={viewType} />
            </div>
          )}
          <Link to="/create">
            <Button variant="outline">Create New Course</Button>
          </Link>
          <Link to="/courses">
            <Button variant="ghost">My Courses</Button>
          </Link>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="absolute top-[60px] left-0 w-full bg-background z-50 border-b border-border/80 md:hidden animate-fade-in">
            <div className="container py-4 flex flex-col gap-2">
              {currentPersona && viewType && (
                <div className="w-full mb-2">
                  <PersonaCard viewType={viewType} />
                </div>
              )}
              <Link to="/create" className="w-full" onClick={() => setMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start">Create New Course</Button>
              </Link>
              <Link to="/courses" className="w-full" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">My Courses</Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Page Title Section */}
      {(title || subtitle) && (
        <div className="container-wide pt-8 pb-6">
          {backLink && (
            <Link to={backLink} className="inline-flex items-center text-muted-foreground text-sm mb-2 hover:text-foreground transition-colors">
              <ChevronRight size={16} className="rotate-180 mr-1" />
              {backLabel || 'Back'}
            </Link>
          )}
          {title && <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h1>}
          {subtitle && <p className="mt-2 text-muted-foreground max-w-3xl">{subtitle}</p>}
        </div>
      )}
    </header>
  );
};

export default Header;
