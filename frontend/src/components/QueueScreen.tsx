import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface QueueScreenProps {
  onCancel: () => void;
}

const TIPS = [
  'Your choices reveal more than small talk ever could.',
  'No bios, no photos — just pure dilemma synergy.',
  'The best conversations start from impossible questions.',
  'Every answer locks in simultaneously for fairness.',
];

export const QueueScreen: React.FC<QueueScreenProps> = ({ onCancel }) => {
  const [seconds, setSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(tipTimer);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formattedTime = `${minutes}:${secs < 10 ? '0' + secs : secs}`;

  const isSettlingIn = seconds >= 12;
  const isTakingLong = seconds >= 35;

  return (
    <main className="organic-page relative z-10 flex-1 min-h-0 w-full flex flex-col items-center justify-center px-4 pt-14 pb-6 overflow-x-hidden">
      <div className="organic-blob organic-blob--aqua w-80 h-80 right-[12%] top-[20%] opacity-50 pointer-events-none" aria-hidden="true" />
      <Card className="w-full max-w-md p-5 sm:p-8 flex flex-col items-center gap-5 sm:gap-6 text-center bg-surface-container-lowest/80 rounded-[2rem_1.4rem_2rem_1.4rem] sm:rounded-[3rem_2rem_3rem_2rem] border border-glass-border shadow-elevation-2 backdrop-blur-xl">
        {/* Category Pill Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-glass-border text-xs font-mono font-bold text-on-surface">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Making a little room for chance</span>
        </div>

        {/* Radar Graphic */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Subtle concentric rings */}
          <div className="absolute inset-0 rounded-[48%_52%_42%_58%] border border-primary/25 animate-pulse-radar" aria-hidden="true" />
          <div className="absolute inset-4 rounded-[58%_42%_55%_45%] border border-accent/25 animate-pulse-radar" style={{ animationDelay: '0.8s' }} aria-hidden="true" />
          {/* Slow rotating sweep for a sense of forward motion */}
          <div
            className="absolute inset-0 rounded-[48%_52%_42%_58%] animate-spin-slow motion-reduce:animate-none"
            style={{ background: 'conic-gradient(from 0deg, rgba(236,139,173,0.28), transparent 28%)' }}
            aria-hidden="true"
          />

          {/* Central search badge */}
          <div className="relative z-10 w-14 h-14 rounded-[45%_55%_48%_52%] bg-gradient-to-br from-primary via-primary-container to-accent text-white flex items-center justify-center shadow-elevation-2">
            <span className="material-symbols-outlined text-[26px]">search</span>
          </div>
        </div>

        {/* Status Copy */}
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl font-bold text-on-surface">
            Looking for your next spark
          </h2>
          <p className="text-xs text-on-surface-variant max-w-xs">
            We’re pairing you with another curious person for a quick seven-question exchange.
          </p>
        </div>

        {/* Liveness Capsule */}
        <div className="flex items-center gap-2 bg-surface-container px-3.5 py-1.5 rounded-full border border-glass-border">
          <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" aria-hidden="true" />
          <span className="font-mono text-xs font-bold text-on-surface" aria-live="polite">
            Searching · {formattedTime}
          </span>
        </div>

        {/* Gentle reassurance while settling in */}
        {isSettlingIn && !isTakingLong && (
          <div className="w-full p-3 rounded-md bg-surface-container-high border border-glass-border text-xs text-on-surface-variant text-left flex items-start gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">favorite</span>
            <span>Still searching — thanks for hanging on.</span>
          </div>
        )}

        {/* Taking Long / Timeout notice */}
        {isTakingLong && (
          <div className="w-full p-3 rounded-md bg-surface-container-high border border-glass-border text-xs text-on-surface-variant text-left flex items-start gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">info</span>
            <span>Still with you — staying put usually finds someone soon. You can also cancel and retry any time.</span>
          </div>
        )}

        {/* Rotating Tip */}
        <p className="text-xs font-body-md text-on-surface-variant min-h-[32px] italic max-w-xs transition-opacity duration-300">
          "{TIPS[tipIndex]}"
        </p>

        {/* Cancel Button */}
        <Button
          variant="secondary-solid"
          size="md"
          onClick={onCancel}
          leftIcon="close"
          className="w-full"
        >
          Cancel Search
        </Button>
      </Card>
    </main>
  );
};
