import React, { useState } from 'react';
import { DailyQuestionCard } from './DailyQuestionCard';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Chip } from './ui/Chip';
import { Logo } from './ui/Logo';

interface LandingScreenProps {
  onFindMatch: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenTerms?: () => void;
  onOpenCookieSettings?: () => void;
}

const HERO_SLIDES = [
  {
    id: 'slide_1',
    communityName: 'Vibe Duel #142',
    category: 'Twin Flame Match',
    membersCount: '1,248 online',
    avatarAlias: 'LunaEcho',
    avatarSeed: 'seed_cosmic',
    gradient: 'from-[#800b0b] via-[#9c1414] to-[#1e2022]',
    badge: '86% Mutual Synergy',
    tagline: 'Faced off in 7 rapid dilemmas. Agreed on 6 out of 7 impossible moral choices.',
    participants: ['CosmicWanderer', 'LunaEcho', 'NeonPickle'],
  },
  {
    id: 'slide_2',
    communityName: 'Philosophy Arena',
    category: 'Late Night High-Stakes',
    membersCount: '894 online',
    avatarAlias: 'VortexRider',
    avatarSeed: 'seed_neon',
    gradient: 'from-[#1e2022] via-[#3a151b] to-[#800b0b]',
    badge: '92% Synergy Record',
    tagline: 'High-frequency philosophical contrasts. Fast 20-second blind voting rounds.',
    participants: ['VortexRider', 'CyberOtter', 'StarlightFox'],
  },
  {
    id: 'slide_3',
    communityName: 'Unfiltered Debates',
    category: 'Deep Thought Mode',
    membersCount: '2,105 online',
    avatarAlias: 'SolarPanda',
    avatarSeed: 'seed_solar',
    gradient: 'from-[#9c1414] via-[#800b0b] to-[#b45309]',
    badge: '78% Mutual Synergy',
    tagline: 'Absurd hypotheticals, instant alignment, and zero awkward icebreaker small talk.',
    participants: ['SolarPanda', 'VelvetDragon', 'WildFalcon'],
  },
];

const LEADERBOARD_DATA = {
  '7days': [
    { rank: 1, alias: 'Alex Kim', score: '3,842 pts', shift: '+120 pts', level: 9, avatar: 'seed_cosmic' },
    { rank: 2, alias: 'Morgan Reed', score: '3,110 pts', shift: '+85 pts', level: 8, avatar: 'seed_neon' },
    { rank: 3, alias: 'Sam Jordan', score: '2,820 pts', shift: '+60 pts', level: 7, avatar: 'seed_solar' },
    { rank: 4, alias: 'Taylor Chen', score: '1,990 pts', shift: '+40 pts', level: 6, avatar: 'seed_emerald' },
  ],
  '30days': [
    { rank: 1, alias: 'Morgan Reed', score: '14,250 pts', shift: '+410 pts', level: 14, avatar: 'seed_neon' },
    { rank: 2, alias: 'Alex Kim', score: '12,980 pts', shift: '+350 pts', level: 13, avatar: 'seed_cosmic' },
    { rank: 3, alias: 'Taylor Chen', score: '10,400 pts', shift: '+220 pts', level: 11, avatar: 'seed_emerald' },
    { rank: 4, alias: 'Sam Jordan', score: '9,810 pts', shift: '+190 pts', level: 10, avatar: 'seed_solar' },
  ],
  'alltime': [
    { rank: 1, alias: 'Alex Kim', score: '48,120 pts', shift: 'Legend', level: 24, avatar: 'seed_cosmic' },
    { rank: 2, alias: 'Morgan Reed', score: '42,900 pts', shift: 'Master', level: 21, avatar: 'seed_neon' },
    { rank: 3, alias: 'Jordan Vance', score: '38,450 pts', shift: 'Diamond', level: 19, avatar: 'seed_cyan' },
    { rank: 4, alias: 'Sam Jordan', score: '31,200 pts', shift: 'Gold', level: 16, avatar: 'seed_solar' },
  ],
};

const FAQ_DATA = [
  {
    category: 'General',
    q: 'What is WouldYouMatch?',
    a: 'WouldYouMatch? is a real-time social icebreaker where two people face off in rapid "Would You Rather" dilemmas to reveal immediate values alignment and mutual synergy without any small talk.',
  },
  {
    category: 'General',
    q: 'How long does a duel take?',
    a: 'Each round has a 20-second countdown timer. A full dilemma duel typically concludes in under 90 seconds, immediately unlocking post-game chat and rematch options.',
  },
  {
    category: 'Gameplay & Synergy',
    q: 'How is the Mutual Synergy score calculated?',
    a: 'Synergy represents the exact percentage of dilemma choices where you and your opponent locked in the same option. It aggregates across all shared duels to calculate your long-term compatibility.',
  },
  {
    category: 'Gameplay & Synergy',
    q: 'Can players see my choice before locking in?',
    a: 'Never. Choices are strictly blind and simultaneous. A subtle indicator appears when your opponent locks in, but choices are only revealed once both players answer or the timer runs out.',
  },
  {
    category: 'Privacy & Accounts',
    q: 'Do I need to create an account to play?',
    a: 'No! You can play immediately as a guest with an anonymous alias. When you want to save friends or message history, a soft 1-click upgrade attaches your history to a permanent account.',
  },
  {
    category: 'Privacy & Accounts',
    q: 'Is WouldYouMatch? free to play?',
    a: 'Yes, WouldYouMatch? is completely free during public beta. All features—including live duels, post-game private chat, 1:1 direct messages, and personality archetype stats—are 100% unlocked.',
  },
];

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onFindMatch,
  onOpenPrivacyPolicy,
  onOpenTerms,
  onOpenCookieSettings,
}) => {
  // Hero Carousel State
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const activeSlide = HERO_SLIDES[activeSlideIdx];

  // Platform Feature Tab State
  const [platformTab, setPlatformTab] = useState<'arena' | 'chat' | 'leaderboard' | 'youspace'>('arena');

  // Interactive Duel Demo State inside the "Arena" tab
  const [demoSelectedChoice, setDemoSelectedChoice] = useState<'left' | 'right' | null>(null);
  const [demoRevealed, setDemoRevealed] = useState(false);

  // Leaderboard Time Filter State
  const [leaderboardFilter, setLeaderboardFilter] = useState<'7days' | '30days' | 'alltime'>('7days');

  // FAQ Category and Open Items State
  const [faqCategory, setFaqCategory] = useState<string>('General');
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([0]);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleDemoChoice = (choice: 'left' | 'right') => {
    setDemoSelectedChoice(choice);
    setTimeout(() => {
      setDemoRevealed(true);
    }, 600);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredFaqs = FAQ_DATA.filter((f) => f.category === faqCategory);

  return (
    <div className="w-full flex flex-col items-center overflow-x-hidden pt-20 pb-16">
      
      {/* ════════════════════════════════════════════════════════════════════════
          1. HERO SECTION (With Interactive App Window Showcase)
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="w-full max-w-6xl px-4 md:px-6 pt-8 md:pt-14 pb-16 flex flex-col items-center text-center">
        
        {/* Category Pill Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/80 border border-glass-border text-on-surface text-xs font-mono font-semibold mb-6 animate-fade-in shadow-elevation-1">
          <span className="text-primary font-bold">✦</span>
          <span>Instant Values Compatibility</span>
        </div>

        {/* Main Hero Headline */}
        <h1 className="font-display text-4xl sm:text-6xl lg:text-[68px] font-bold leading-[1.08] tracking-tight text-on-surface max-w-4xl">
          Meet someone through <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-primary via-primary-container to-accent bg-clip-text text-transparent">
            seven impossible choices.
          </span>
        </h1>

        {/* Body Description */}
        <p className="font-body-md text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-2xl mt-5 mb-8">
          Skip the dry small talk. Face off in rapid, real-time "Would You Rather" dilemmas against a stranger and discover instant compatibility in under 90 seconds.
        </p>

        {/* Action Button Group with Single Unambiguous Primary CTA */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-14">
          <Button
            variant="primary-gradient"
            size="lg"
            onClick={onFindMatch}
            rightIcon="arrow_forward"
            className="rounded-full px-8 py-3.5 text-base font-bold shadow-elevation-2 ring-2 ring-primary/40 hover:ring-primary/80 hover:scale-105 active:scale-95 transition-all animate-pulse-subtle cursor-pointer"
          >
            Start Dilemma Duel — Free
          </Button>
          <Button
            variant="secondary-solid"
            size="lg"
            onClick={() => scrollToSection('features')}
            className="rounded-full px-6 py-3 text-sm font-semibold opacity-90 hover:opacity-100 cursor-pointer"
          >
            How It Works
          </Button>
        </div>

        {/* ── Embedded App Showcase Window (Exact Video Mockup) ── */}
        <div className="w-full max-w-4xl bg-surface-container-lowest/90 border border-glass-border rounded-2xl shadow-elevation-2 overflow-hidden flex flex-col text-left transition-all backdrop-blur-sm">
          
          {/* Mockup Window Header Bar */}
          <div className="h-10 px-4 border-b border-glass-border/60 bg-surface-container-low/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-error/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-tertiary/70" />
              <span className="text-[11px] font-mono text-on-surface-variant ml-2 hidden sm:inline">
                wouldyoumatch.app/arena/live-vibe
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-on-surface-variant">
              <span className="flex items-center gap-1.5 text-tertiary font-bold">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                <span>1,248 dueling live</span>
              </span>
            </div>
          </div>

          {/* Mockup Window Body (Sidebar + Dynamic Community Card) */}
          <div className="flex flex-col md:flex-row min-h-[380px]">
            
            {/* Left App Sidebar */}
            <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-glass-border/60 p-4 flex flex-col gap-4 bg-surface-container-low/40 shrink-0">
              {/* Search trigger */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-glass-border text-xs text-on-surface-variant font-body-md">
                <span className="material-symbols-outlined text-[16px]">search</span>
                <span>Search arena…</span>
              </div>

              {/* Sidebar Menu */}
              <div className="flex flex-col gap-1">
                {[
                  { icon: 'dashboard', label: 'Overview', active: true },
                  { icon: 'sports_esports', label: 'Duel Arena', active: false },
                  { icon: 'chat', label: 'Live Chat', active: false },
                  { icon: 'insights', label: 'Leaderboard', active: false },
                  { icon: 'group', label: 'Friends', active: false },
                  { icon: 'account_circle', label: 'You Space', active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-label-md transition-colors cursor-pointer ${
                      item.active
                        ? 'bg-surface-container font-bold text-primary'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Categories Sublist */}
              <div className="mt-auto pt-2 border-t border-glass-border/40 flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant font-bold px-2">
                  Dilemma Packs
                </span>
                <span className="text-[11px] font-body-md text-on-surface-variant px-2 py-0.5 truncate hover:text-on-surface cursor-pointer">
                  ✦ Moral Dilemmas
                </span>
                <span className="text-[11px] font-body-md text-on-surface-variant px-2 py-0.5 truncate hover:text-on-surface cursor-pointer">
                  ✦ Wild & Chaotic
                </span>
                <span className="text-[11px] font-body-md text-on-surface-variant px-2 py-0.5 truncate hover:text-on-surface cursor-pointer">
                  ✦ Food & Lifestyle
                </span>
              </div>
            </div>

            {/* Right Dynamic Card Showcase */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-primary/5">
              
              {/* Dynamic Community Preview Card */}
              <div className="w-full max-w-md rounded-2xl border border-glass-border bg-surface-container-lowest shadow-elevation-2 overflow-hidden flex flex-col transition-all">
                
                {/* Banner Gradient Header */}
                <div className={`h-28 w-full bg-gradient-to-br ${activeSlide.gradient} relative flex items-center justify-center p-4`}>
                  {/* Subtle decorative mesh overlay */}
                  <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" />
                  <span className="relative z-10 text-xs font-mono font-bold uppercase tracking-widest text-white/90 bg-black/30 px-3 py-1 rounded-full border border-white/20">
                    {activeSlide.category}
                  </span>
                </div>

                {/* Card Body with Overlapping Avatar */}
                <div className="px-5 pb-5 pt-0 flex flex-col items-center text-center relative">
                  {/* Avatar overlapping seam */}
                  <div className="-mt-8 mb-2 ring-4 ring-surface-container-lowest rounded-full shadow-elevation-1">
                    <Avatar alias={activeSlide.avatarAlias} seed={activeSlide.avatarSeed} size="lg" isGradient={true} />
                  </div>

                  <h3 className="font-display font-bold text-lg text-on-surface">
                    {activeSlide.communityName}
                  </h3>

                  <div className="flex items-center gap-2 mt-1 mb-3">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                      {activeSlide.badge}
                    </span>
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      {activeSlide.membersCount}
                    </span>
                  </div>

                  <p className="text-xs font-body-md text-on-surface-variant leading-relaxed mb-4 max-w-xs">
                    {activeSlide.tagline}
                  </p>

                  <Button
                    variant="primary-gradient"
                    size="sm"
                    onClick={onFindMatch}
                    className="w-full rounded-xl py-2 font-bold shadow-elevation-1 text-xs"
                    rightIcon="play_arrow"
                  >
                    Join Duel Now
                  </Button>
                </div>
              </div>

              {/* Carousel Slide Indicators */}
              <div className="flex items-center gap-2 mt-5">
                {HERO_SLIDES.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSlideIdx(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      activeSlideIdx === idx ? 'w-6 bg-primary' : 'w-2 bg-on-surface-variant/40 hover:bg-on-surface-variant'
                    }`}
                    aria-label={`Show slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          2. EDITORIAL VALUE PROPOSITION STATEMENT
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="about" className="w-full max-w-4xl px-4 md:px-6 py-12 md:py-16 flex flex-col items-start text-left border-t border-glass-border">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-glass-border text-xs font-mono font-bold text-on-surface mb-6">
          <span className="text-accent font-bold">+</span>
          <span>Zero Small Talk</span>
        </div>

        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold leading-snug text-on-surface max-w-3xl">
          Seven dilemmas is all it takes. WouldYouMatch? is a real-time social arena built for curious minds, creators, and night owls to connect without awkward filler.
        </h2>

        <p className="font-body-md text-base md:text-lg text-on-surface-variant leading-relaxed max-w-2xl mt-4">
          Skip days of surface-level texting. In under 90 seconds, you face high-stakes ethical puzzles and chaotic hypotheticals simultaneously. When the dust settles, your mutual synergy reveals exactly who you’re talking to.
        </p>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          3. MULTI-TAB PLATFORM SHOWCASE ("One platform to discover your vibe")
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="w-full max-w-6xl px-4 md:px-6 py-16 flex flex-col items-center">
        
        {/* Section Tag & Split Heading */}
        <div className="w-full flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-10 text-left">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-glass-border text-xs font-mono font-bold text-on-surface mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Core Gameplay</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-on-surface">
              One platform to discover <br className="hidden sm:inline" />
              your true vibe alignment.
            </h2>
          </div>
          <p className="font-body-md text-sm md:text-base text-on-surface-variant max-w-md">
            Fast blind choices, instant chord harmonies, Discord-grade post-game chat, and persistent friend direct messaging—all synchronized over WebSockets.
          </p>
        </div>

        {/* Symmetric Platform Feature Tabs (Grid for zero clipping & clean alignment) */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-glass-border pb-2 mb-6">
          {[
            { id: 'arena', label: 'Duel Arena', icon: 'sports_esports' },
            { id: 'chat', label: 'Live Chat', icon: 'chat' },
            { id: 'leaderboard', label: 'Leaderboard', icon: 'insights' },
            { id: 'youspace', label: 'You Space', icon: 'account_circle' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPlatformTab(tab.id as any)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-label-md font-bold uppercase tracking-wider transition-all cursor-pointer rounded-lg border-b-2 ${
                platformTab === tab.id
                  ? 'border-primary text-primary bg-primary/10 shadow-elevation-1'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] shrink-0">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Interactive Tab Viewport ── */}
        <div className="w-full rounded-2xl border border-glass-border bg-surface-container-lowest shadow-elevation-2 p-5 sm:p-8 min-h-[420px] flex flex-col justify-center transition-all">
          
          {/* TAB 1: DUEL ARENA INTERACTIVE DEMO */}
          {platformTab === 'arena' && (
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center animate-fade-in">
              <div className="flex items-center justify-between w-full mb-4 px-2">
                <div className="flex items-center gap-2">
                  <Avatar alias="You" seed="seed_cosmic" size="sm" isGradient={true} />
                  <span className="text-xs font-bold font-display text-on-surface">You</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-primary/15 text-primary px-2.5 py-0.5 rounded-full">
                    ROUND 3 OF 7
                  </span>
                  <span className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-mono text-xs font-bold text-primary">
                    14s
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-display text-on-surface">LunaEcho</span>
                  <Avatar alias="LunaEcho" seed="seed_neon" size="sm" isGradient={true} />
                </div>
              </div>

              <span className="text-[11px] font-mono text-on-surface-variant uppercase font-bold tracking-wider mb-2">
                Interactive Simulator · Click your choice below
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full my-2">
                <button
                  onClick={() => handleDemoChoice('left')}
                  className={`p-5 rounded-xl border text-left flex flex-col justify-between min-h-[110px] transition-all cursor-pointer ${
                    demoSelectedChoice === 'left'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-glass-border bg-surface-container hover:border-glass-border-hover'
                  }`}
                >
                  <span className="font-mono text-[10px] font-bold text-primary">OPTION A</span>
                  <span className="font-display font-bold text-sm text-on-surface">
                    Read minds, but only when people dislike you
                  </span>
                </button>

                <button
                  onClick={() => handleDemoChoice('right')}
                  className={`p-5 rounded-xl border text-left flex flex-col justify-between min-h-[110px] transition-all cursor-pointer ${
                    demoSelectedChoice === 'right'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-glass-border bg-surface-container hover:border-glass-border-hover'
                  }`}
                >
                  <span className="font-mono text-[10px] font-bold text-primary">OPTION B</span>
                  <span className="font-display font-bold text-sm text-on-surface">
                    See the future, but forget it immediately after
                  </span>
                </button>
              </div>

              {demoRevealed && (
                <div className="mt-4 p-3 rounded-xl bg-tertiary/15 border border-tertiary/30 text-tertiary text-xs font-bold flex items-center gap-2 animate-toast">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Both Matched! LunaEcho also chose this option (+1 Synergy Point)</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE CHAT & VIBE */}
          {platformTab === 'chat' && (
            <div className="w-full max-w-xl mx-auto flex flex-col gap-3 animate-fade-in text-left">
              <div className="flex items-center justify-between pb-3 border-b border-glass-border">
                <div className="flex items-center gap-2.5">
                  <Avatar alias="LunaEcho" seed="seed_neon" size="sm" isGradient={true} />
                  <div>
                    <span className="text-xs font-bold font-display text-on-surface block leading-tight">LunaEcho</span>
                    <span className="text-[10px] font-mono text-primary font-bold">86% Synergy · Twin Flames 🔥</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-tertiary font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  Active now
                </span>
              </div>

              {/* Message Group */}
              <div className="flex flex-col gap-2 my-2">
                <div className="flex items-start gap-2.5">
                  <Avatar alias="LunaEcho" seed="seed_neon" size="sm" className="w-6 h-6" isGradient={true} />
                  <div className="flex flex-col">
                    <div className="bg-surface-container p-3 rounded-2xl rounded-tl-sm text-xs font-body-md text-on-surface border border-glass-border">
                      Round 3 was completely unhinged! Reading minds only when people hate you is brutal! 😂
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.2 rounded-full border border-primary/20">
                        🔥 2
                      </span>
                      <span className="text-[10px] font-mono bg-surface-container text-on-surface-variant px-2 py-0.2 rounded-full">
                        😂 4
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="bg-primary/20 border border-primary/30 p-3 rounded-2xl rounded-tr-sm text-xs font-body-md text-on-surface max-w-[80%]">
                    I know right! But seeing the future and immediately forgetting it would drive me crazy 🔮
                  </div>
                  <span className="text-[9px] font-mono text-on-surface-variant mt-0.5">Sent ✓</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono italic">
                <span>LunaEcho is typing</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-200" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEADERBOARD & STREAKS */}
          {platformTab === 'leaderboard' && (
            <div className="w-full max-w-xl mx-auto flex flex-col gap-3 animate-fade-in text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                  Global Vibe Standings
                </span>
                <div className="flex gap-1 bg-surface-container p-1 rounded-lg border border-glass-border">
                  {(['7days', '30days', 'alltime'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setLeaderboardFilter(filter)}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-md transition-all cursor-pointer ${
                        leaderboardFilter === filter
                          ? 'bg-primary text-white shadow-elevation-1'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-glass-border/40 border border-glass-border rounded-xl overflow-hidden bg-surface-container-lowest">
                {LEADERBOARD_DATA[leaderboardFilter].map((row) => (
                  <div key={row.rank} className="p-3 flex items-center justify-between hover:bg-surface-container/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-xs font-bold w-5 text-center ${row.rank === 1 ? 'text-amber-400' : 'text-on-surface-variant'}`}>
                        #{row.rank}
                      </span>
                      <Avatar alias={row.alias} seed={row.avatar} size="sm" isGradient={true} />
                      <div className="flex flex-col">
                        <span className="font-display font-bold text-xs text-on-surface">{row.alias}</span>
                        <span className="text-[10px] font-mono text-on-surface-variant">Level {row.level}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-primary">{row.score}</span>
                      <span className="text-[10px] font-mono text-tertiary bg-tertiary/10 px-1.5 py-0.2 rounded">
                        {row.shift}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: YOU SPACE HUB */}
          {platformTab === 'youspace' && (
            <div className="w-full max-w-xl mx-auto flex flex-col gap-4 animate-fade-in text-left">
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <Avatar alias="CosmicRider" seed="seed_cosmic" size="lg" isGradient={true} />
                  <div>
                    <span className="font-display font-bold text-base text-on-surface block">CosmicRider</span>
                    <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
                      ⚡ Twin Flame Magnet
                    </span>
                  </div>
                </div>
                <Chip variant="primary" size="sm">
                  Verified Member
                </Chip>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-surface-container p-3 rounded-xl border border-glass-border">
                  <span className="font-display font-bold text-lg text-primary block">28</span>
                  <span className="text-[10px] font-label-md text-on-surface-variant uppercase font-bold">Duels</span>
                </div>
                <div className="bg-surface-container p-3 rounded-xl border border-glass-border">
                  <span className="font-display font-bold text-lg text-accent block">74%</span>
                  <span className="text-[10px] font-label-md text-on-surface-variant uppercase font-bold">Avg Vibe</span>
                </div>
                <div className="bg-surface-container p-3 rounded-xl border border-glass-border">
                  <span className="font-display font-bold text-lg text-tertiary block">100%</span>
                  <span className="text-[10px] font-label-md text-on-surface-variant uppercase font-bold">Best Vibe</span>
                </div>
                <div className="bg-surface-container p-3 rounded-xl border border-glass-border">
                  <span className="font-display font-bold text-lg text-on-surface block">5 🔥</span>
                  <span className="text-[10px] font-label-md text-on-surface-variant uppercase font-bold">Streak</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          4. BENTO GRID / "WHAT YOU GET" SECTION
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="what-you-get" className="w-full max-w-6xl px-4 md:px-6 py-16 flex flex-col items-center text-left">
        <div className="w-full flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-glass-border text-xs font-mono font-bold text-on-surface mb-3">
              <span className="text-primary font-bold">✦</span>
              <span>What you get</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-on-surface">
              Set up once. <br className="hidden sm:inline" />
              Duel the way you want.
            </h2>
          </div>
          <p className="font-body-md text-sm md:text-base text-on-surface-variant max-w-md">
            WouldYouMatch? is engineered so you spend time connecting and laughing, not configuring complex settings or filling onboarding surveys.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
          
          {/* Bento Card 1: Your Front Door */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-glass-border shadow-elevation-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider block mb-1">
                ✦ Your Front Door
              </span>
              <h3 className="font-display font-bold text-xl text-on-surface mb-2">
                A public profile that speaks for itself.
              </h3>
              <p className="text-xs font-body-md text-on-surface-variant leading-relaxed mb-6">
                Customize your seed aura, display alias, and unique URL. Your profile reveals real-time mutual compatibility with anyone who visits.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-glass-border flex flex-col items-center text-center">
              <Avatar alias="DesignLab" seed="seed_neon" size="md" isGradient={true} className="mb-2" />
              <span className="font-display font-bold text-xs text-on-surface">DesignLab</span>
              <span className="text-[10px] font-mono text-on-surface-variant mb-2">wouldyoumatch.app/u/designlab</span>
              <Button variant="primary-gradient" size="sm" className="w-full text-xs py-1 rounded-lg">
                Challenge to Duel
              </Button>
            </div>
          </div>

          {/* Bento Card 2: Friendly Competition */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-glass-border shadow-elevation-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider block mb-1">
                ✦ Friendly Competition
              </span>
              <h3 className="font-display font-bold text-xl text-on-surface mb-2">
                Leaderboards that actually track vibe.
              </h3>
              <p className="text-xs font-body-md text-on-surface-variant leading-relaxed mb-6">
                Rankings based on consistency, win streaks, and mutual synergy. Climb from Curious Explorer to Twin Flame Master.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-glass-border flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-on-surface">Top Weekly Duos</span>
                <span className="text-tertiary">Live Updates</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-lowest flex items-center justify-between text-xs">
                <span className="font-bold text-on-surface">1. Cosmic & Luna</span>
                <span className="font-mono text-primary font-bold">96% Vibe</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-lowest flex items-center justify-between text-xs">
                <span className="font-bold text-on-surface">2. Vortex & Otter</span>
                <span className="font-mono text-primary font-bold">91% Vibe</span>
              </div>
            </div>
          </div>

          {/* Bento Card 3: AI Dilemma Engine */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-glass-border shadow-elevation-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-tertiary uppercase tracking-wider block mb-1">
                ✦ AI Dilemma Engine
              </span>
              <h3 className="font-display font-bold text-xl text-on-surface mb-2">
                Infinite, non-repeating questions.
              </h3>
              <p className="text-xs font-body-md text-on-surface-variant leading-relaxed mb-6">
                Smart pool generation with match history exclusion ensures neither you nor your opponent faces repeated questions.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container border border-glass-border flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-tertiary font-bold">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                <span>AI Generator Active</span>
              </div>
              <p className="text-xs font-body-md text-on-surface leading-snug">
                "Live in an orbital space station with zero gravity OR an underwater glass dome with glowing sea life?"
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[9px] font-mono bg-primary/10 text-primary px-2 py-0.2 rounded-full">
                  Sci-Fi
                </span>
                <span className="text-[9px] font-mono bg-accent/10 text-accent px-2 py-0.2 rounded-full">
                  Balanced 50/50
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          5. COMMUNITY DAILY DILEMMA HERO SECTION
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="w-full max-w-4xl px-4 md:px-6 py-12 flex flex-col items-center">
        <div className="text-center mb-6">
          <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider block mb-1">
            ✦ Community Question of the Day
          </span>
          <h3 className="font-display text-2xl font-bold text-on-surface">
            How does your instinct compare to the world?
          </h3>
        </div>
        <div className="w-full">
          <DailyQuestionCard onPlayQuickMatch={onFindMatch} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          6. FAQ ACCORDION SECTION
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="w-full max-w-6xl px-4 md:px-6 py-16 flex flex-col items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 text-left">
          
          {/* Left Column: Category Tabs & Support Box */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-glass-border text-xs font-mono font-bold text-on-surface mb-3">
                <span className="text-primary font-bold">✦</span>
                <span>FAQ</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-on-surface leading-tight">
                Answers to questions that come up most.
              </h2>
            </div>

            {/* Category Switcher Tabs */}
            <div className="flex flex-col gap-1.5">
              {['General', 'Gameplay & Synergy', 'Privacy & Accounts'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFaqCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-label-md font-bold transition-all text-left cursor-pointer border ${
                    faqCategory === cat
                      ? 'bg-surface-container border-primary/30 text-primary shadow-elevation-1'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Got Questions Box */}
            <div className="p-4 rounded-xl bg-surface-container border border-glass-border flex flex-col gap-1.5">
              <span className="text-xs font-display font-bold text-on-surface">Got Questions?</span>
              <p className="text-[11px] text-on-surface-variant">
                Can’t find what you’re looking for? Tap into our community or report suggestions in the ops console.
              </p>
              <a href="mailto:support@wouldyoumatch.app" className="text-xs text-primary font-bold hover:underline mt-1">
                Email us →
              </a>
            </div>
          </div>

          {/* Right Column: Accordion Items */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndices.includes(idx);
              return (
                <div
                  key={faq.q}
                  className="rounded-xl border border-glass-border bg-surface-container-lowest overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-display font-bold text-sm text-on-surface">
                      {faq.q}
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-on-surface-variant transition-transform duration-200 shrink-0">
                      {isOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs font-body-md text-on-surface-variant leading-relaxed border-t border-glass-border/40 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          8. PRE-FOOTER CALL TO ACTION (Bottom Hero Banner)
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="w-full max-w-5xl px-4 md:px-6 py-12">
        <div className="w-full p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-surface-container-lowest via-surface-container to-primary/10 border border-primary/20 shadow-elevation-2 flex flex-col md:flex-row items-center justify-between gap-8 text-left">
          <div className="max-w-md">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-on-surface leading-tight mb-3">
              Your community is one sec away.
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed mb-6">
              WouldYouMatch? is in beta and completely free to play. Set up your space, challenge your first opponent, and see what it feels like when seven dilemmas spark instant chemistry.
            </p>
            <Button
              variant="primary-gradient"
              size="lg"
              onClick={onFindMatch}
              rightIcon="sports_esports"
              className="rounded-full px-8 py-3 text-sm font-bold shadow-elevation-1"
            >
              Start for Free
            </Button>
          </div>

          <div className="w-full md:w-64 p-4 rounded-2xl bg-surface-container-lowest border border-glass-border shadow-elevation-2 flex flex-col items-center text-center">
            <Avatar alias="MatchArena" seed="seed_cosmic" size="lg" isGradient={true} className="mb-2 ring-4 ring-primary/20" />
            <span className="font-display font-bold text-sm text-on-surface">WouldYouMatch? Arena</span>
            <span className="text-[10px] font-mono text-tertiary font-bold mt-0.5">● 1,248 Online Now</span>
            <p className="text-[11px] text-on-surface-variant mt-2 mb-3 leading-snug">
              Instant blind reveals & mutual synergy calculations.
            </p>
            <Button variant="secondary-solid" size="sm" onClick={onFindMatch} className="w-full text-xs py-1.5">
              Enter Arena
            </Button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          9. RICH FOOTER
      ════════════════════════════════════════════════════════════════════════ */}
      <footer className="w-full max-w-6xl px-4 md:px-6 pt-16 pb-8 border-t border-glass-border text-left">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Info */}
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-2.5">
            <Logo size="md" />
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Real-time "Would You Rather" social icebreaker. Instant compatibility through rapid choices.
            </p>
          </div>

          {/* Product Links */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">Product</span>
            <button onClick={() => scrollToSection('about')} className="text-xs text-on-surface-variant hover:text-on-surface text-left transition-colors cursor-pointer">About</button>
            <button onClick={() => scrollToSection('features')} className="text-xs text-on-surface-variant hover:text-on-surface text-left transition-colors cursor-pointer">Features</button>
            <button onClick={() => scrollToSection('what-you-get')} className="text-xs text-on-surface-variant hover:text-on-surface text-left transition-colors cursor-pointer">What you get</button>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">Resources</span>
            <button onClick={() => scrollToSection('faq')} className="text-xs text-on-surface-variant hover:text-on-surface text-left transition-colors cursor-pointer">FAQ</button>
            <button onClick={onFindMatch} className="text-xs text-on-surface-variant hover:text-on-surface text-left transition-colors cursor-pointer">Quick Match</button>
            <a href="mailto:support@wouldyoumatch.app" className="text-xs text-on-surface-variant hover:text-on-surface transition-colors">Support</a>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">Legal</span>
            <button
              onClick={onOpenTerms}
              className="text-xs text-on-surface-variant cursor-pointer hover:text-on-surface text-left transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={onOpenPrivacyPolicy}
              className="text-xs text-on-surface-variant cursor-pointer hover:text-on-surface text-left transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={onOpenCookieSettings}
              className="text-xs text-on-surface-variant cursor-pointer hover:text-on-surface text-left transition-colors"
            >
              Cookie Settings
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-glass-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-on-surface-variant">
          <span>© {new Date().getFullYear()} WouldYouMatch? All rights reserved.</span>
          <span>Zero-friction social duel platform.</span>
        </div>
      </footer>
    </div>
  );
};
