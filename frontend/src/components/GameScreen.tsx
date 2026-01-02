import React, { useState, useEffect } from 'react';
import { Question, RoundResult, User } from '../types';
import { sounds } from '../services/sound';
import { Avatar } from './ui/Avatar';

interface GameScreenProps {
  currentRound: number;
  totalRounds: number;
  question: Question;
  opponent: User | null;
  onSubmitAnswer: (choice: 'left' | 'right') => void;
  lastResult: RoundResult | null;
  opponentAnswered: boolean;
  vibeScore: number;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  currentRound,
  totalRounds,
  question,
  opponent,
  onSubmitAnswer,
  lastResult,
  opponentAnswered,
  vibeScore,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<'left' | 'right' | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(20);

  useEffect(() => {
    setSelectedChoice(null);
    setTimeLeft(20);
    sounds.playRoundTick();
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentRound, question.id]);

  const handleSelect = (choice: 'left' | 'right') => {
    if (selectedChoice || lastResult) return;
    setSelectedChoice(choice);
    onSubmitAnswer(choice);
  };

  // Keyboard accessibility for fast arcade dilemma duel choices
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowLeft' || e.key === '1' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelect('left');
      } else if (e.key === 'ArrowRight' || e.key === '2' || e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleSelect('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChoice, lastResult]);

  const isUrgent = timeLeft <= 5;

  return (
    <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 md:px-6 pt-20 pb-8 max-w-4xl mx-auto w-full min-h-[calc(100vh-4rem)]">
      {/* ── Top HUD ── */}
      <div className="w-full flex items-center justify-between gap-3 mb-8 p-4 rounded-2xl bg-surface-container-lowest border border-glass-border shadow-elevation-1">
        {/* Left: Round Progress Dots */}
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Round {currentRound}/{totalRounds}
          </span>
          <div className="flex items-center gap-1.5" aria-label={`Round ${currentRound} of ${totalRounds}`}>
            {Array.from({ length: totalRounds }, (_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                  i < vibeScore
                    ? 'bg-primary'
                    : i < currentRound - 1
                    ? 'bg-on-surface-variant/30'
                    : i === currentRound - 1
                    ? 'bg-on-surface ring-2 ring-primary/40 ring-offset-1 ring-offset-background'
                    : 'bg-surface-container-highest'
                }`}
                title={`Round ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Center: Urgency-Aware Timer */}
        <div
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all ${
            isUrgent
              ? 'bg-error/15 border-error text-error font-bold animate-pulse'
              : 'bg-surface-container border-glass-border text-on-surface'
          }`}
          role="timer"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isUrgent ? 'alarm' : 'timer'}
          </span>
          <span className="font-mono text-xs font-bold">
            {timeLeft}s {isUrgent ? '• URGENT' : ''}
          </span>
        </div>

        {/* Right: Opponent Status Chip */}
        <div className="flex items-center gap-2.5">
          <Avatar
            alias={opponent?.alias}
            size="sm"
            showStatus={false}
            isGradient={true}
          />
          <div className="hidden sm:flex flex-col text-left">
            <span className="font-label-md text-xs font-bold text-on-surface truncate max-w-[90px]">
              {opponent?.alias || 'Opponent'}
            </span>
            <span className={`text-[11px] font-medium ${opponentAnswered ? 'text-tertiary font-bold' : 'text-on-surface-variant'}`}>
              {opponentAnswered ? '✓ Locked in' : 'Thinking…'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Category Pill Tag ── */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-glass-border text-xs font-mono font-bold text-on-surface mb-3">
        <span className="text-primary font-bold">✦</span>
        <span>Simultaneous Blind Duel</span>
      </div>

      {/* ── Prompt Header ── */}
      <h2 className="font-display text-2xl md:text-3xl font-bold text-on-surface text-center mb-8">
        Would you rather…
      </h2>

      {/* ── Duel Choice Cards (Split Option A vs Option B) ── */}
      <div className="flex flex-col md:flex-row w-full gap-5 items-stretch justify-center relative">
        {/* Option A (Left Choice) */}
        <button
          onClick={() => handleSelect('left')}
          disabled={Boolean(selectedChoice) || Boolean(lastResult)}
          aria-label={`Option A: ${question.left}`}
          className={`group relative flex-1 min-h-[200px] md:min-h-[240px] rounded-2xl p-7 flex flex-col items-center justify-center text-center transition-all duration-150 cursor-pointer border select-none ${
            selectedChoice === 'left'
              ? 'bg-surface-container shadow-state-selected-coral border-primary ring-2 ring-primary/30'
              : selectedChoice
              ? 'bg-surface-container-lowest border-glass-border opacity-40 cursor-default'
              : 'bg-surface-container-lowest hover:bg-surface-container-low border-glass-border hover:border-primary/50 shadow-elevation-1 hover:shadow-elevation-2 active:scale-[0.99]'
          }`}
        >
          {/* Identifier Badge for Accessibility */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-mono font-bold border border-primary/20">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span>OPTION A</span>
            </div>
            <span className="hidden sm:inline-block text-[10px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-glass-border">
              ← or A
            </span>
          </div>

          <h3 className="font-display text-lg md:text-xl font-bold text-on-surface leading-snug">
            {question.left}
          </h3>

          {/* Locked-in State Overlay */}
          {selectedChoice === 'left' && (
            <div className="absolute inset-0 bg-surface/80 backdrop-blur-xs flex items-center justify-center rounded-2xl animate-fade-in">
              <div className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-full font-label-md text-xs font-bold shadow-elevation-1">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Choice Locked</span>
              </div>
            </div>
          )}
        </button>

        {/* OR Badge in Center */}
        <div className="self-center md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-10 w-9 h-9 rounded-full bg-surface-container border border-glass-border flex items-center justify-center shadow-elevation-1 pointer-events-none">
          <span className="font-display text-xs font-bold text-on-surface-variant">OR</span>
        </div>

        {/* Option B (Right Choice) */}
        <button
          onClick={() => handleSelect('right')}
          disabled={Boolean(selectedChoice) || Boolean(lastResult)}
          aria-label={`Option B: ${question.right}`}
          className={`group relative flex-1 min-h-[200px] md:min-h-[240px] rounded-2xl p-7 flex flex-col items-center justify-center text-center transition-all duration-150 cursor-pointer border select-none ${
            selectedChoice === 'right'
              ? 'bg-surface-container shadow-state-selected-violet border-accent ring-2 ring-accent/30'
              : selectedChoice
              ? 'bg-surface-container-lowest border-glass-border opacity-40 cursor-default'
              : 'bg-surface-container-lowest hover:bg-surface-container-low border-glass-border hover:border-accent/50 shadow-elevation-1 hover:shadow-elevation-2 active:scale-[0.99]'
          }`}
        >
          {/* Identifier Badge for Accessibility */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-mono font-bold border border-accent/20">
              <span className="material-symbols-outlined text-[14px]">flare</span>
              <span>OPTION B</span>
            </div>
            <span className="hidden sm:inline-block text-[10px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-glass-border">
              → or B
            </span>
          </div>

          <h3 className="font-display text-lg md:text-xl font-bold text-on-surface leading-snug">
            {question.right}
          </h3>

          {/* Locked-in State Overlay */}
          {selectedChoice === 'right' && (
            <div className="absolute inset-0 bg-surface/80 backdrop-blur-xs flex items-center justify-center rounded-2xl animate-fade-in">
              <div className="flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-full font-label-md text-xs font-bold shadow-elevation-1">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Choice Locked</span>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* ── Round Outcome Result Banner ── */}
      {lastResult && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up"
        >
          <div
            className={`px-5 py-2.5 rounded-full shadow-elevation-2 flex items-center gap-3 border ${
              lastResult.agreed
                ? 'bg-surface-container-lowest border-tertiary/40 text-on-surface'
                : 'bg-surface-container-lowest border-glass-border text-on-surface'
            }`}
          >
            <span className="text-lg" aria-hidden="true">
              {lastResult.agreed ? '⚡' : '💥'}
            </span>
            <div className="flex items-center gap-2 text-xs font-label-md">
              <span className="font-bold text-sm text-on-surface">
                {lastResult.agreed ? 'Mutual Match!' : 'Dilemma Clash'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-mono font-bold ${
                  lastResult.agreed
                    ? 'bg-tertiary/15 text-tertiary'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {lastResult.agreed ? '+1 Synergy Point' : 'Different Choices'}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
