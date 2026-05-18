import React, { useState, useEffect } from 'react';
import { DailyQuestion } from '../types';
import { Button } from './ui/Button';
import { apiFetch } from '../services/api';

interface DailyQuestionCardProps {
  onPlayQuickMatch: () => void;
}

export const DailyQuestionCard: React.FC<DailyQuestionCardProps> = ({ onPlayQuickMatch }) => {
  const [daily, setDaily] = useState<DailyQuestion | null>(null);
  const [answeredChoice, setAnsweredChoice] = useState<'left' | 'right' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDaily = () => {
    setLoading(true);
    apiFetch(`/api/daily`)
      .then((res) => {
        if (!res.ok) throw new Error('daily unavailable');
        return res.json();
      })
      .then((data) => {
        setDaily(data);
        setLoading(false);
      })
      .catch(() => {
        // No invented fallback question: surface the empty state instead.
        setDaily(null);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDaily();
  }, []);

  const handleAnswer = (choice: 'left' | 'right') => {
    if (answeredChoice || !daily) return;
    setAnsweredChoice(choice);
    // Single vote path: the answer endpoint records exactly one community vote.
    apiFetch(`/api/daily/answer`, {
      method: 'POST',
      body: JSON.stringify({ question_id: daily.id, choice }),
    })
      .then(() => apiFetch(`/api/daily`))
      .then((res) => (res && res.ok ? res.json() : null))
      .then((data) => {
        if (data) setDaily(data);
      })
      .catch(() => {});
  };

  if (loading) {
    return (
      <div className="glass-surface p-6 rounded-lg flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          <span>Loading Daily Vibe...</span>
        </div>
      </div>
    );
  }

  if (!daily) {
    if (loading) return null;
    return (
      <div className="glass-surface p-6 rounded-lg flex flex-col items-center justify-center gap-2 min-h-[300px] text-center">
        <span className="material-symbols-outlined text-[24px] text-on-surface-variant">cloud_off</span>
        <span className="font-display font-bold text-sm text-on-surface">No daily dilemma right now</span>
        <span className="text-xs text-on-surface-variant">The dilemma pool is empty. Check back later.</span>
        <Button variant="secondary-solid" size="sm" onClick={loadDaily} className="mt-1 text-xs">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-surface p-6 rounded-lg flex flex-col gap-4 shadow-elevation-1 transition-colors duration-150">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-primary">
          <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
          <span className="font-label-md text-xs font-bold uppercase tracking-wider">Daily Vibe</span>
        </div>
        <span className="font-mono text-xs text-on-surface-variant font-medium">
          {daily.total_votes === 0 ? 'No votes yet' : `${daily.total_votes.toLocaleString()} votes`}
        </span>
      </div>

      {/* Question */}
      <h3 className="font-display text-lg md:text-xl font-bold text-on-surface text-center leading-snug">
        Would You Rather?
      </h3>
      {daily.total_votes === 0 && !answeredChoice && (
        <p className="text-[11px] font-mono text-on-surface-variant text-center -mt-2">
          No community votes recorded yet — your pick will be the first.
        </p>
      )}

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {/* Left Option */}
        <button
          onClick={() => handleAnswer('left')}
          disabled={Boolean(answeredChoice)}
          className={`relative overflow-hidden p-3.5 rounded-md border text-left transition-all duration-150 cursor-pointer ${
            answeredChoice === 'left'
              ? 'bg-primary/10 border-primary shadow-sm'
              : 'bg-surface-container-low hover:bg-surface-container border-glass-border'
          } ${answeredChoice ? 'cursor-default' : ''}`}
        >
          {/* Solid fill indicator */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-primary/15 transition-all duration-500 rounded-l-md"
            style={{ width: answeredChoice && daily.left_percent !== null ? `${daily.left_percent}%` : '0%' }}
            aria-hidden="true"
          />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <span className="font-body-md text-sm font-medium text-on-surface">{daily.left}</span>
            {answeredChoice && daily.left_percent !== null && (
              <span className="font-mono text-xs font-bold text-primary shrink-0">
                {daily.left_percent}%
              </span>
            )}
          </div>
        </button>

        {/* Right Option */}
        <button
          onClick={() => handleAnswer('right')}
          disabled={Boolean(answeredChoice)}
          className={`relative overflow-hidden p-3.5 rounded-md border text-left transition-all duration-150 cursor-pointer ${
            answeredChoice === 'right'
              ? 'bg-accent/10 border-accent shadow-sm'
              : 'bg-surface-container-low hover:bg-surface-container border-glass-border'
          } ${answeredChoice ? 'cursor-default' : ''}`}
        >
          {/* Solid fill indicator */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-accent/15 transition-all duration-500 rounded-l-md"
            style={{ width: answeredChoice && daily.right_percent !== null ? `${daily.right_percent}%` : '0%' }}
            aria-hidden="true"
          />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <span className="font-body-md text-sm font-medium text-on-surface">{daily.right}</span>
            {answeredChoice && daily.right_percent !== null && (
              <span className="font-mono text-xs font-bold text-accent shrink-0">
                {daily.right_percent}%
              </span>
            )}
          </div>
        </button>
      </div>

      {/* CTA Button */}
      <Button
        variant="secondary-solid"
        size="md"
        onClick={onPlayQuickMatch}
        rightIcon="arrow_forward"
        className="w-full text-xs mt-1"
      >
        Quick Match on This Dilemma
      </Button>
    </div>
  );
};
