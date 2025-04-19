
import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import CourseCard from '@/components/CourseCard';
import { useCourseContext } from '@/context/CourseContext';

const CoursesList = () => {
  const { courses } = useCourseContext();

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        title="My Courses" 
        subtitle="Browse and manage your AI-generated courses" 
      />
      
      <main className="flex-grow py-10">
        <div className="container-wide">
          {courses.length === 0 ? (
            <div className="text-center py-16 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold mb-4">No Courses Yet</h2>
              <p className="text-muted-foreground mb-8">
                You haven't created any courses yet. Get started by creating your first AI-generated course.
              </p>
              <Link to="/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Course
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-6">
                <Link to="/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Course
                  </Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {courses.map((course, index) => (
                  <CourseCard key={index} course={course} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default CoursesList;
