import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Logo } from './ui/Logo';
import { Avatar } from './ui/Avatar';
import { DailyQuestionCard } from './DailyQuestionCard';
import { API_BASE, apiFetch } from '../services/api';
import { User } from '../types';

interface LandingScreenProps {
  onFindMatch: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenTerms?: () => void;
  onOpenCookieSettings?: () => void;
  currentUser?: User | null;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  alias: string;
  avatar_seed: string;
  online: boolean;
  total_duels: number;
  avg_synergy: number;
  best_synergy: number;
}

const steps = [
  ['01', 'Arrive as you are', 'No profile performance. Just a name, a tiny corner of the internet, and an open mind.'],
  ['02', 'Choose in sync', 'Seven playful dilemmas, answered at the same time so the moment stays honest.'],
  ['03', 'Keep the spark', 'See your shared rhythm, then let a private conversation take it from there.'],
];

export const LandingScreen: React.FC<LandingScreenProps> = ({ onFindMatch, onOpenPrivacyPolicy, onOpenTerms, onOpenCookieSettings, currentUser }) => {
  // Live room data — only real recorded platform activity, never invented.
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [activeMatches, setActiveMatches] = useState<number | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [leadersState, setLeadersState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/health`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.users_online === 'number') {
          setOnlineCount(data.users_online);
          setActiveMatches(typeof data.active_matches === 'number' ? data.active_matches : null);
        }
      })
      .catch(() => {
        /* live figures stay hidden when the server is unreachable */
      });
    apiFetch('/api/leaderboard?window=7days&limit=5')
      .then((res) => {
        if (!res.ok) throw new Error('leaderboard unavailable');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const rows = data.leaderboard || [];
        setLeaders(rows);
        setLeadersState(rows.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (!cancelled) {
          setLeaders([]);
          setLeadersState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
  <main className="organic-page min-h-[100dvh] pt-14 overflow-x-hidden">
    <div className="organic-blob organic-blob--coral w-72 h-72 -top-20 right-[10%] opacity-80 pointer-events-none" aria-hidden="true" />
    <div className="organic-blob organic-blob--aqua w-64 h-64 top-[42rem] -left-28 opacity-70 pointer-events-none" aria-hidden="true" />

    <section className="relative mx-auto flex min-h-[min(760px,100dvh)] max-w-6xl items-center px-4 sm:px-6 py-10 sm:py-14 md:px-8 md:py-20">
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
        <div className="relative z-10 max-w-xl animate-screen-enter">
          <span className="organic-eyebrow">A social game for chance chemistry</span>
          <h1 className="font-display mt-5 sm:mt-6 text-4xl sm:text-6xl md:text-7xl font-bold leading-[.96] sm:leading-[.94] tracking-[-.05em] sm:tracking-[-.06em] text-on-surface">
            Seven choices.<span className="gradient-text-hero block pt-2">One unexpected hello.</span>
          </h1>
          <p className="mt-5 sm:mt-7 max-w-md text-sm sm:text-base leading-relaxed text-on-surface-variant md:text-lg">
            WouldYouMatch? turns impossible little questions into a real place to begin. Find someone, pick a side, discover the rhythm you share.
          </p>
          <div className="mt-7 sm:mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="primary-gradient" size="lg" onClick={onFindMatch} rightIcon="arrow_forward" className="w-full sm:w-auto rounded-full px-7 shadow-elevation-2">
              Find a match
            </Button>
            <button onClick={() => document.getElementById('how-it-feels')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full px-5 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface">
              See how it feels <span aria-hidden="true">↓</span>
            </button>
          </div>
          <div className="mt-7 sm:mt-9 flex items-center gap-3 text-xs text-on-surface-variant">
            <div className="flex -space-x-2 shrink-0" aria-hidden="true">
              {['#eea177', '#73bdb9', '#bd658b'].map((color) => (
                <span key={color} className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border-2 border-background" style={{ background: color }} />
              ))}
            </div>
            <span>Private by default. Human on purpose.</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none animate-screen-enter pb-6 sm:pb-0" style={{ animationDelay: '90ms' }}>
          <div className="organic-panel relative overflow-hidden rounded-[2.25rem_1.6rem_2.5rem_1.8rem] sm:rounded-[3rem_2rem_3.5rem_2.25rem] p-5 sm:p-7">
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-[45%_55%_65%_35%] bg-primary/15 pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[.14em] text-on-surface-variant">Your first spark</p>
                <p className="mt-1 font-display text-lg sm:text-xl font-bold text-on-surface">A question for two</p>
              </div>
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-[45%_55%_48%_52%] bg-tertiary/20 text-tertiary">
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">flare</span>
              </div>
            </div>
            <div className="mt-7 sm:mt-9 text-center">
              <p className="font-display text-xl sm:text-3xl font-bold leading-tight text-on-surface">Would you rather…</p>
              <p className="mx-auto mt-3 sm:mt-4 max-w-xs text-xs sm:text-sm leading-relaxed text-on-surface-variant">wake up somewhere entirely new, or see your favourite place with fresh eyes?</p>
            </div>
            <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="rounded-[1.4rem_1.1rem_1.5rem_1.1rem] sm:rounded-[2rem_1.4rem_2.2rem_1.3rem] border border-primary/20 bg-primary/10 px-3 py-4 sm:px-4 sm:py-5 text-center text-xs sm:text-sm font-bold text-primary">Somewhere new</div>
              <div className="rounded-[1.1rem_1.4rem_1.1rem_1.5rem] sm:rounded-[1.4rem_2rem_1.3rem_2.2rem] border border-accent/20 bg-accent/10 px-3 py-4 sm:px-4 sm:py-5 text-center text-xs sm:text-sm font-bold text-accent">Fresh eyes</div>
            </div>
            <div className="mt-5 sm:mt-7 flex items-center justify-center gap-2 text-xs font-medium text-on-surface-variant">
              <span className="h-2 w-2 animate-pulse rounded-full bg-tertiary" /> both answers reveal together
            </div>
          </div>
          <div className="organic-panel relative mt-3 sm:mt-0 sm:absolute sm:-bottom-7 sm:-left-6 inline-flex rounded-full sm:rounded-[1.7rem_1.2rem_1.7rem_1.2rem] px-4 py-2 sm:py-3 text-xs font-semibold text-on-surface shadow-elevation-1 sm:shadow-elevation-2">
            <span className="mr-1 text-tertiary">✦</span> no awkward opening line
          </div>
        </div>
      </div>
    </section>

    <section id="how-it-feels" className="relative mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20 md:px-8 md:py-28">
      <div className="max-w-2xl">
        <span className="organic-eyebrow">Designed for a softer start</span>
        <h2 className="font-display mt-4 sm:mt-5 text-3xl sm:text-4xl font-bold leading-tight tracking-[-.05em] text-on-surface md:text-5xl">Less scrolling. More serendipity.</h2>
      </div>
      <div className="mt-10 sm:mt-12 grid gap-4 sm:gap-5 md:grid-cols-3">
        {steps.map(([number, title, copy], index) => (
          <article key={number} className="organic-panel rounded-[2rem_1.4rem_1.8rem_1.5rem] sm:rounded-[2.5rem_1.6rem_2.1rem_1.8rem] p-6 sm:p-7 transition-transform duration-300 md:hover:-translate-y-1" style={{ transform: index === 1 ? 'var(--tw-translate-y, 0)' : undefined }}>
            <span className="font-display text-2xl sm:text-3xl font-bold text-primary/65">{number}</span>
            <h3 className="font-display mt-5 sm:mt-8 text-lg sm:text-xl font-bold text-on-surface">{title}</h3>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-on-surface-variant">{copy}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="mx-auto grid max-w-6xl gap-8 sm:gap-10 px-4 sm:px-6 py-10 sm:py-12 md:grid-cols-[.8fr_1.2fr] md:px-8 md:py-24">
      <div className="self-center">
        <span className="organic-eyebrow">Today’s small dilemma</span>
        <h2 className="font-display mt-4 sm:mt-5 text-2xl sm:text-4xl font-bold tracking-[-.05em] text-on-surface">Try the room on for size.</h2>
        <p className="mt-3 sm:mt-4 max-w-sm text-xs sm:text-sm leading-relaxed text-on-surface-variant">One question, shared with everyone who drops by today. Choose your side, then step into a match when you’re ready.</p>
        {currentUser?.alias && <p className="mt-4 sm:mt-6 text-xs sm:text-sm font-semibold text-primary">Welcome back, {currentUser.alias}.</p>}
      </div>
      <div className="mx-auto w-full max-w-xl">
        <DailyQuestionCard onPlayQuickMatch={onFindMatch} />
      </div>
    </section>

    <section id="rankings" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12 md:px-8 md:py-16">
      <div className="organic-panel relative overflow-hidden rounded-[2.25rem_1.6rem_2.25rem_1.6rem] sm:rounded-[2.5rem_1.8rem_2.5rem_1.8rem] p-5 sm:p-7 md:p-9">
        <div className="absolute -left-12 -bottom-14 h-44 w-44 rounded-[55%_45%_60%_40%] bg-accent/10 pointer-events-none" aria-hidden="true" />
        <div className="relative grid gap-6 sm:gap-8 md:grid-cols-[.9fr_1.1fr] md:items-start">
          <div>
            <span className="organic-eyebrow">The room right now</span>
            <h2 className="font-display mt-4 sm:mt-5 text-2xl sm:text-3xl font-bold tracking-[-.05em] text-on-surface md:text-4xl">Alive, right this second.</h2>
            <p className="mt-2 sm:mt-3 max-w-xs text-xs sm:text-sm leading-relaxed text-on-surface-variant">Live figures from this server — nothing staged, nothing estimated.</p>
            <div className="mt-5 sm:mt-6 flex flex-wrap gap-2.5 sm:gap-3">
              {onlineCount !== null ? (
                <div className="flex items-center gap-2 rounded-full border border-glass-border bg-surface-container-lowest px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-on-surface">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-tertiary" />
                  {onlineCount} online now
                </div>
              ) : (
                <div className="rounded-full border border-glass-border px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs text-on-surface-variant">Presence unavailable</div>
              )}
              {activeMatches !== null && (
                <div className="rounded-full border border-glass-border bg-surface-container-lowest px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-on-surface">
                  {activeMatches} {activeMatches === 1 ? 'duel' : 'duels'} live
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[.14em] text-on-surface-variant">Top synergy · past 7 days</p>
            <div className="mt-3 overflow-hidden rounded-[1.4rem_1.1rem_1.4rem_1.1rem] sm:rounded-[1.6rem_1.2rem_1.6rem_1.2rem] border border-glass-border bg-surface-container-lowest">
              {leadersState === 'loading' && (
                <p className="px-4 py-6 text-center text-xs text-on-surface-variant">Reading recorded standings…</p>
              )}
              {leadersState === 'error' && (
                <p className="px-4 py-6 text-center text-xs text-on-surface-variant">Standings are unavailable right now.</p>
              )}
              {leadersState === 'empty' && (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs sm:text-sm font-bold text-on-surface">No ranked duelists yet</p>
                  <p className="mt-1 text-[11px] sm:text-xs text-on-surface-variant">No duels recorded this week. Play one to take the top spot.</p>
                </div>
              )}
              {leadersState === 'ready' && leaders.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-2.5 sm:gap-3 border-b border-glass-border/50 px-3.5 py-2.5 last:border-0">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                    <span className={`w-5 shrink-0 text-center font-mono text-xs font-bold ${row.rank === 1 ? 'text-amber-400' : 'text-on-surface-variant'}`}>#{row.rank}</span>
                    <Avatar alias={row.alias} seed={row.avatar_seed} size="sm" isGradient={true} />
                    <div className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1.5 truncate font-display text-xs font-bold text-on-surface">
                        {row.alias}
                        {row.online && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tertiary" aria-label="online" />}
                      </span>
                      <span className="font-mono text-[9px] sm:text-[10px] text-on-surface-variant">{row.total_duels} {row.total_duels === 1 ? 'duel' : 'duels'}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{row.avg_synergy}%</span>
                    <span className="rounded-full bg-tertiary/10 px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px] text-tertiary">best {row.best_synergy}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-14 pt-6 sm:pb-24 sm:pt-8 md:px-8">
      <div className="relative overflow-hidden rounded-[2.25rem_1.6rem_2.25rem_1.6rem] sm:rounded-[3rem_2rem_3rem_2rem] bg-gradient-to-br from-primary via-[#aa5f8d] to-accent px-6 py-10 text-white shadow-elevation-2 md:px-12 md:py-14">
        <div className="absolute -right-14 -top-16 h-64 w-64 rounded-full bg-white/10 pointer-events-none" aria-hidden="true" />
        <div className="relative max-w-xl">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[.14em] text-white/70">The next conversation is already out there</p>
          <h2 className="font-display mt-3 sm:mt-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-[-.05em]">Let the first question do the work.</h2>
          <Button variant="secondary-solid" size="lg" onClick={onFindMatch} className="mt-6 sm:mt-8 w-full sm:w-auto rounded-full border-white/25 bg-white text-primary hover:bg-white/90">
            Start a 7-round match
          </Button>
        </div>
      </div>
    </section>

    <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:px-6 pb-8 text-xs text-on-surface-variant sm:flex-row sm:items-center sm:justify-between md:px-8">
      <div className="flex items-center gap-2">
        <Logo size="sm" />
        <span className="truncate">Questions make the best first move.</span>
      </div>
      <div className="flex items-center gap-5">
        <button onClick={onOpenPrivacyPolicy} className="hover:text-on-surface cursor-pointer py-1">Privacy</button>
        <button onClick={onOpenTerms} className="hover:text-on-surface cursor-pointer py-1">Terms</button>
        <button onClick={onOpenCookieSettings} className="hover:text-on-surface cursor-pointer py-1">Cookies</button>
      </div>
    </footer>
  </main>
  );
};
