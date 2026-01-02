import React from 'react';
import { Button } from './ui/Button';
import { Logo } from './ui/Logo';

interface NotFoundScreenProps {
  onGoHome: () => void;
}

export const NotFoundScreen: React.FC<NotFoundScreenProps> = ({ onGoHome }) => {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-background text-on-surface text-center">
      {/* Background ambient lighting */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30" 
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(201, 42, 42, 0.15) 0%, transparent 60%)'
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-6 p-6 sm:p-8 rounded-2xl bg-surface-container-low border border-glass-border shadow-elevation-2 animate-fade-in">
        <Logo size="lg" />

        <div className="flex flex-col items-center gap-2">
          <span className="text-5xl sm:text-6xl font-mono font-bold text-primary tracking-tight">
            404
          </span>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-on-surface">
            Lost in the Dilemma Void
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-sm leading-relaxed">
            The page or match room you're looking for doesn't exist, was moved, or has expired.
          </p>
        </div>

        {/* Playful Dilemma Preview */}
        <div className="w-full p-4 rounded-xl bg-surface-container border border-glass-border text-left flex flex-col gap-2">
          <span className="text-[10px] font-mono text-tertiary uppercase font-bold tracking-wider">
            ⚡ Quick Choice
          </span>
          <p className="text-xs text-on-surface font-medium">
            Would you rather wander aimlessly through broken links, or return to the arena for a live vibe duel?
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Button
            variant="primary-gradient"
            size="md"
            onClick={onGoHome}
            className="w-full font-bold shadow-sm"
          >
            ⚔️ Return to Arena
          </Button>
        </div>
      </div>
    </main>
  );
};
