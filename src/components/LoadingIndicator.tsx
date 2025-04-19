
import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
  label?: string;
  className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  size = 'md', 
  inline = false, 
  label = 'Loading...', 
  className 
}) => {
  const spinnerSize = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div 
      className={cn(
        "flex items-center justify-center",
        inline ? "inline-flex" : "w-full py-8",
        className
      )}
    >
      <div 
        className={cn(
          "animate-spin rounded-full border-t-transparent",
          "border-primary/70 border-solid",
          spinnerSize[size]
        )}
      />
      {label && <span className="ml-3 text-muted-foreground">{label}</span>}
    </div>
  );
};

export default LoadingIndicator;
