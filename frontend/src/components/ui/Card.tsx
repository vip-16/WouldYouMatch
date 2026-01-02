import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  isGlass?: boolean;
  elevation?: 1 | 2;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  isGlass = false,
  elevation = 1,
  className = '',
  children,
  ...props
}) => {
  const elevationClass = elevation === 2 ? 'shadow-elevation-2' : 'shadow-elevation-1';
  const surfaceClass = isGlass ? 'glass-surface' : 'bg-surface-container-lowest border border-glass-border';

  return (
    <div
      className={`rounded-lg ${surfaceClass} ${elevationClass} transition-colors duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
