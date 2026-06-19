import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, Message, RoundSummaryItem } from '../types';
import { Avatar } from './ui/Avatar';
import {
  Send,
  UserPlus,
  RefreshCw,
  Share2,
  ShieldAlert,
  LogOut,
  Sparkles,
  Smile,
  X,
  UserCheck,
  ChevronDown,
  Lock,
  Compass,
  ArrowRight,
  ChevronUp,
  AlertCircle,
  CheckCheck
} from 'lucide-react';

interface PostGameScreenProps {
  vibeScore: number;
  totalRounds: number;
  shareHash?: string;
  opponent: User | null;
  currentUser: User | null;
  chatUnlocked: boolean;
  roundsSummary?: RoundSummaryItem[];
  opponentLeft: { alias: string; reason?: string } | null;
  messages: Message[];
  onSendMessage: (body: string) => void;
  onReactMessage: (msgId: string, emoji: string) => void;
  onTyping: (isTyping: boolean) => void;
  opponentTyping: boolean;
  onConnectRequest: () => void;
  connectState: 'none' | 'requested' | 'pending' | 'mutual';
  onRematchRequest: () => void;
  rematchState: 'none' | 'requested' | 'pending' | 'mutual';
  onLeave: () => void;
  onFindMatch?: () => void;
  onOpenProfile: () => void;
  onOpenReport: () => void;
  onOpenShare: () => void;
}

interface Toast {
  id: string;
  text: string;
  type: 'info' | 'success' | 'action';
  actionLabel?: string;
  onAction?: () => void;
}

const QUICK_PROMPTS = [
  'Hey there! Glad we matched!',
  'Why did you pick that one in round 3?',
  'We think way too alike 🔥',
  'What made you choose that last answer?',
  'Run it back for a rematch! 🎮',
  'Are you always this decisive?',
];

const EMOJI_PALETTE = ['👍', '❤️', '😂', '🔥', '😮', '💀', '🎉', '👀', '✨', '🙌', '💯', '🤝'];

export const PostGameScreen: React.FC<PostGameScreenProps> = ({
  vibeScore,
  totalRounds,
  opponent,
  currentUser,
  chatUnlocked,
  roundsSummary = [],
  opponentLeft,
  messages,
  onSendMessage,
  onReactMessage,
  onTyping,
  opponentTyping,
  onConnectRequest,
  connectState,
  onRematchRequest,
  rematchState,
  onLeave,
  onFindMatch,
  onOpenProfile,
  onOpenReport,
  onOpenShare,
}) => {
  const [inputBody, setInputBody] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [showRecapDrawer, setShowRecapDrawer] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevConnectState = useRef(connectState);
  const prevRematchState = useRef(rematchState);
  const prevMessagesLength = useRef(messages.length);

  const targetPercentage = Math.round((vibeScore / Math.max(totalRounds, 1)) * 100);

  // Helper to extract option text from left/right based on user answer
  const getAnswerText = (item: RoundSummaryItem, side?: string) => {
    if (!side) return 'No answer';
    return side === 'left' ? item.left : item.right;
  };

  // Format time: "Today, 8:30 pm"
  const formatMessageTime = useCallback((ts?: number) => {
    const d = ts ? new Date(ts < 1e11 ? ts * 1000 : ts) : new Date();
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const timeStr = `${formattedHours}:${formattedMinutes} ${ampm}`;

    return `${isToday ? 'Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  }, []);

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Dismiss dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false);
      }
      if (activeReactionMsgId) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-reaction-container]')) {
          setActiveReactionMsgId(null);
        }
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEmojiPicker(false);
        setActiveReactionMsgId(null);
        setShowOverflowMenu(false);
        setShowPrompts(false);
        setShowRecapDrawer(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeReactionMsgId]);

  // Scroll to bottom on new message
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      scrollToBottom(true);
    }
    prevMessagesLength.current = messages.length;
  }, [messages, scrollToBottom]);

  // Watch notifications for friends & rematch
  useEffect(() => {
    if (prevConnectState.current !== 'pending' && connectState === 'pending') {
      pushToast({
        text: `${opponent?.alias || 'Opponent'} sent you a friend request!`,
        type: 'action',
        actionLabel: 'Accept',
        onAction: onConnectRequest,
      });
    }
    if (prevConnectState.current !== 'mutual' && connectState === 'mutual') {
      pushToast({
        text: `You and ${opponent?.alias || 'Opponent'} are now friends!`,
        type: 'success',
      });
    }
    prevConnectState.current = connectState;
  }, [connectState, opponent?.alias, onConnectRequest, pushToast]);

  useEffect(() => {
    if (prevRematchState.current !== 'pending' && rematchState === 'pending') {
      pushToast({
        text: `${opponent?.alias || 'Opponent'} challenged you to a rematch!`,
        type: 'action',
        actionLabel: 'Accept',
        onAction: onRematchRequest,
      });
    }
    if (prevRematchState.current !== 'mutual' && rematchState === 'mutual') {
      pushToast({ text: 'Rematch accepted! Starting new match...', type: 'success' });
    }
    prevRematchState.current = rematchState;
  }, [rematchState, opponent?.alias, onRematchRequest, pushToast]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (opponentLeft) return;
    const trimmed = inputBody.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
    setInputBody('');
    setShowEmojiPicker(false);
    setShowPrompts(false);
    onTyping(false);
    scrollToBottom(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (opponentLeft) return;
    setInputBody(e.target.value);
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 1800);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN VARIANT 1: 0–3 MATCHES (CHAT LOCKED / NOT MEANT TO CHAT)
  // ──────────────────────────────────────────────────────────────────────────
  if (!chatUnlocked) {
    return (
      <div className="organic-page flex-1 min-h-0 w-full h-full flex flex-col bg-background text-on-surface select-text relative overflow-y-auto">
        {/* Global Toast Layer */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-zinc-900/95 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs py-2.5 px-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-fade-in border border-zinc-700/40"
            >
              <span className="font-medium truncate">{toast.text}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                className="opacity-70 hover:opacity-100 p-0.5 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

      {/* Minimal Navigation Bar */}
        <header className="sticky top-0 z-20 w-full bg-surface/80 backdrop-blur-xl border-b border-glass-border px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 flex items-center justify-between shrink-0 shadow-elevation-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onOpenProfile}
              className="relative cursor-pointer rounded-full shrink-0 group focus:outline-none"
              title="View Opponent Profile"
            >
              <Avatar
                alias={opponent?.alias || 'Opponent'}
                size="sm"
                isGradient={true}
                className="w-8 h-8 border border-glass-border"
              />
            </button>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-bold text-on-surface truncate leading-tight font-display">
                {opponent?.alias || 'Opponent'}
              </span>
              <span className="text-[10px] sm:text-[11px] text-on-surface-variant font-mono">
                {vibeScore} of {totalRounds} matched
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={onOpenShare}
              className="p-1.5 sm:p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent hover:border-glass-border transition-colors cursor-pointer"
              title="Share Scorecard"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onLeave}
              className="p-1.5 sm:p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent hover:border-glass-border transition-colors cursor-pointer"
              title="Exit to Lobby"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content: Hero Result */}
        <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col items-center gap-8">
          {/* Opponent Left Notice (if leaver occurred) */}
          {opponentLeft && (
            <div className="w-full bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-center gap-3.5 text-amber-900 dark:text-amber-200 animate-fade-in shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-semibold text-sm leading-tight">
                  {opponentLeft.alias} left the match
                </p>
                <p className="text-on-surface-variant/80 mt-0.5">
                  The match has ended cleanly. Ready to explore another duel?
                </p>
              </div>
            </div>
          )}

          {/* Locked Hero Card */}
          <div className="w-full bg-surface-container-low border border-glass-border rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-elevation-1">
            {/* Background subtle radial glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Lock Badge */}
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-high border border-glass-border flex items-center justify-center shadow-inner">
                <Lock className="w-8 h-8 text-on-surface-variant" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-display text-on-surface tracking-tight">
              Not Meant to Chat
            </h1>

            <p className="text-sm text-on-surface-variant max-w-md mx-auto mt-2 leading-relaxed">
              You and <strong className="text-on-surface font-semibold">{opponent?.alias || 'your opponent'}</strong> agreed
              on <strong className="text-on-surface font-semibold">{vibeScore} of {totalRounds}</strong> dilemmas.
              A minimum of <strong className="text-primary font-semibold">4 matching answers</strong> is required to unlock sanctuary chat.
            </p>

            {/* Synergy Gauge Dots */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                {Array.from({ length: totalRounds }).map((_, i) => {
                  const isMatch = i < vibeScore;
                  return (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                        isMatch
                          ? 'bg-primary ring-2 ring-primary/20 scale-110'
                          : 'bg-surface-container-highest border border-glass-border'
                      }`}
                      title={isMatch ? `Round ${i + 1}: Matched` : `Round ${i + 1}: Diverged`}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-mono font-medium text-on-surface-variant mt-1">
                {vibeScore} / {totalRounds} matches ({targetPercentage}%) • 4 needed to unlock
              </span>
            </div>

            {/* Primary Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {onFindMatch && (
                <button
                  onClick={onFindMatch}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-primary hover:bg-primary-container text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Find Another Opponent</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onOpenShare}
                className="w-full sm:w-auto px-5 py-3 rounded-full bg-surface-container hover:bg-surface-container-high border border-glass-border text-on-surface font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-on-surface-variant" />
                <span>Share Result</span>
              </button>
            </div>
          </div>

          {/* Dilemma Breakdown Section */}
          {roundsSummary.length > 0 && (
            <div className="w-full flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold font-display uppercase tracking-wider text-on-surface-variant">
                  Round-by-Round Breakdown
                </h2>
                <span className="text-xs text-on-surface-variant font-mono">
                  {vibeScore} matched • {roundsSummary.length - vibeScore} diverged
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {roundsSummary.map((item, idx) => {
                  const isMatch = item.agreed;
                  const mySide = currentUser ? item.answers[currentUser.id] : undefined;
                  const oppSide = opponent ? item.answers[opponent.id] : undefined;
                  const myText = getAnswerText(item, mySide);
                  const oppText = getAnswerText(item, oppSide);

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        isMatch
                          ? 'bg-surface-container-low border-emerald-500/20'
                          : 'bg-surface-container-lowest/60 border-glass-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-mono font-medium text-on-surface-variant">
                          Round {item.round}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isMatch
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                              : 'bg-surface-container text-on-surface-variant border border-glass-border'
                          }`}
                        >
                          {isMatch ? (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>Matched</span>
                            </>
                          ) : (
                            <span>Diverged</span>
                          )}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-on-surface mb-2.5 leading-snug">
                        {item.left} <span className="text-on-surface-variant/70 italic">vs</span> {item.right}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div
                          className={`p-2.5 rounded-xl border ${
                            isMatch
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-surface-container border-glass-border'
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-wider font-mono text-on-surface-variant block mb-0.5">
                            You Chose
                          </span>
                          <span className="font-medium text-on-surface">{myText}</span>
                        </div>

                        <div
                          className={`p-2.5 rounded-xl border ${
                            isMatch
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-surface-container border-glass-border'
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-wider font-mono text-on-surface-variant block mb-0.5">
                            {opponent?.alias || 'Opponent'} Chose
                          </span>
                          <span className="font-medium text-on-surface">{oppText}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Secondary Footer Links */}
          <div className="flex items-center gap-4 text-xs text-on-surface-variant pb-8">
            <button
              onClick={onOpenReport}
              className="hover:text-error transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Report User</span>
            </button>
            <span>•</span>
            <button
              onClick={onLeave}
              className="hover:text-on-surface transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN VARIANT 2: 4+ MATCHES (SANCTUARY CHAT UNLOCKED)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="organic-page flex-1 min-h-0 w-full h-full flex flex-col bg-background text-on-surface select-text relative overflow-hidden">
      {/* ════ Toast Notifications Layer ════ */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-zinc-900/95 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs py-2.5 px-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-fade-in border border-zinc-700/40"
          >
            <span className="font-medium truncate">{toast.text}</span>
            <div className="flex items-center gap-2 shrink-0">
              {toast.actionLabel && toast.onAction && (
                <button
                  onClick={() => {
                    toast.onAction?.();
                    dismissToast(toast.id);
                  }}
                  className="bg-primary text-on-primary px-3 py-1 rounded-full font-bold hover:brightness-110 active:scale-95 transition-all text-xs cursor-pointer"
                >
                  {toast.actionLabel}
                </button>
              )}
              <button
                onClick={() => dismissToast(toast.id)}
                className="opacity-70 hover:opacity-100 p-0.5 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ════ Polished Chat Header ════ */}
      <header className="sticky top-0 z-20 w-full bg-surface/85 backdrop-blur-xl border-b border-glass-border px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 flex items-center justify-between shrink-0 shadow-elevation-1">
        {/* Left: Opponent Info & Resonance Badge */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onOpenProfile}
            className="relative cursor-pointer rounded-full shrink-0 group focus:outline-none"
            title="View Profile"
          >
            <Avatar
              alias={opponent?.alias || 'Opponent'}
              size="md"
              showStatus={true}
              statusColor={opponentLeft ? 'offline' : (opponent ? 'online' : 'offline')}
              isGradient={true}
              className="w-9 h-9 sm:w-10 sm:h-10 border border-glass-border"
            />
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base font-bold text-on-surface truncate leading-tight font-display">
                {opponent?.alias || 'Opponent'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold bg-primary/10 text-primary px-2 sm:px-2.5 py-0.5 rounded-full border border-primary/20 shadow-2xs">
                ✦ {targetPercentage}%<span className="hidden sm:inline"> Resonance</span>
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {opponentTyping && !opponentLeft ? (
                <span className="text-xs text-primary font-medium flex items-center gap-1 animate-pulse">
                  <span>typing</span>
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                    <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                    <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                  </span>
                </span>
              ) : opponentLeft ? (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Disconnected / Left
                </span>
              ) : (
                <span className="text-[11px] sm:text-xs text-on-surface-variant leading-tight font-normal truncate">
                  <strong className="text-on-surface font-semibold">{vibeScore}/{totalRounds}</strong> matches
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Header Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Toggle Dilemma Recap */}
          {roundsSummary.length > 0 && (
            <button
              onClick={() => setShowRecapDrawer((prev) => !prev)}
              className={`px-2.5 py-1.5 sm:px-3 rounded-full text-xs font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                showRecapDrawer
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-glass-border'
              }`}
              title="Toggle Round Recap"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="hidden md:inline">Recap</span>
              {showRecapDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Friend Connection Action */}
          {connectState === 'mutual' ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Friends</span>
            </span>
          ) : connectState === 'requested' ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant border border-glass-border text-xs font-medium">
              <span>Requested</span>
            </span>
          ) : connectState === 'pending' ? (
            <button
              onClick={onConnectRequest}
              className="px-2.5 py-1.5 sm:px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Accept</span>
            </button>
          ) : (
            <button
              onClick={onConnectRequest}
              disabled={Boolean(opponentLeft)}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface border border-glass-border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Add as Friend"
            >
              <UserPlus className="w-3.5 h-3.5 text-on-surface-variant" />
              <span className="hidden sm:inline">Add Friend</span>
            </button>
          )}

          {/* Rematch Action */}
          {rematchState === 'mutual' ? (
            <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-xs font-bold">
              Rematch!
            </span>
          ) : rematchState === 'pending' ? (
            <button
              onClick={onRematchRequest}
              className="px-2.5 py-1.5 sm:px-3 rounded-full bg-primary hover:bg-primary-container text-on-primary text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer animate-pulse"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Accept</span>
            </button>
          ) : (
            <button
              onClick={onRematchRequest}
              disabled={rematchState === 'requested' || Boolean(opponentLeft)}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface border border-glass-border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Challenge to Rematch"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rematchState === 'requested' ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {rematchState === 'requested' ? 'Invited…' : 'Rematch'}
              </span>
            </button>
          )}

          {/* Share Scorecard */}
          <button
            onClick={onOpenShare}
            className="p-1.5 sm:p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent hover:border-glass-border transition-colors cursor-pointer"
            title="Share Duel Result"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Overflow Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowOverflowMenu((prev) => !prev)}
              className="p-1.5 sm:p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent hover:border-glass-border transition-colors cursor-pointer"
              title="More Actions"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {showOverflowMenu && (
              <div className="absolute right-0 top-11 z-40 w-48 bg-surface-container-lowest border border-glass-border rounded-2xl shadow-elevation-2 py-1.5 animate-fade-in text-on-surface text-xs font-medium">
                <button
                  onClick={() => {
                    setShowOverflowMenu(false);
                    onOpenProfile();
                  }}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-surface-container cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-tertiary" />
                  <span>View Opponent Profile</span>
                </button>
                <button
                  onClick={() => {
                    setShowOverflowMenu(false);
                    onOpenReport();
                  }}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-surface-container text-on-surface-variant cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-error" />
                  <span>Report Player</span>
                </button>
                <div className="h-px bg-glass-border my-1" />
                <button
                  onClick={() => {
                    setShowOverflowMenu(false);
                    onLeave();
                  }}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-error/10 text-error cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit to Home</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ════ Collapsible Match Recap Drawer ════ */}
      {showRecapDrawer && roundsSummary.length > 0 && (
        <div className="w-full bg-surface-container-low border-b border-glass-border px-4 md:px-8 py-3 max-h-60 overflow-y-auto animate-fade-in shrink-0">
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span className="font-bold font-display uppercase tracking-wider">Shared Dilemmas Recap</span>
              <span>{vibeScore} of {totalRounds} matched</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {roundsSummary.map((item, idx) => {
                const mySide = currentUser ? item.answers[currentUser.id] : undefined;
                const myText = getAnswerText(item, mySide);
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border ${
                      item.agreed
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-surface-container border-glass-border opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant mb-1">
                      <span>Round {item.round}</span>
                      <span className={item.agreed ? 'text-emerald-600 font-bold' : ''}>
                        {item.agreed ? '✓ Both Agreed' : 'Diverged'}
                      </span>
                    </div>
                    <p className="font-medium text-on-surface truncate">
                      {item.left} vs {item.right}
                    </p>
                    <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                      Your Choice: <strong className="text-on-surface">{myText}</strong>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════ Opponent Left Notice Banner ════ */}
      {opponentLeft && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/25 px-4 md:px-8 py-3 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shrink-0 animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>{opponentLeft.alias}</strong> left the match. This chat is now closed.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onFindMatch && (
              <button
                onClick={onFindMatch}
                className="px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-container text-on-primary text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Find Match</span>
              </button>
            )}
            <button
              onClick={onLeave}
              className="px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface border border-glass-border text-xs font-medium transition-all cursor-pointer"
            >
              Exit
            </button>
          </div>
        </div>
      )}

      {/* ════ Chat Messages Container ════ */}
      <div
        ref={feedContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 min-h-0 relative flex flex-col"
      >
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 flex-1">
          {/* Welcome / Chat Unlocked Celebration Card */}
          <div className="flex flex-col items-center justify-center my-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold font-display text-on-surface">
              Sanctuary Chat Unlocked
            </h2>
            <p className="text-xs text-on-surface-variant max-w-sm mt-1 leading-relaxed">
              You and <strong className="text-on-surface font-semibold">{opponent?.alias || 'Opponent'}</strong> reached
              the <strong className="text-primary font-semibold">{vibeScore}/{totalRounds} match threshold</strong>. Say hello or discuss the wild dilemmas!
            </p>
          </div>

          {/* Render Messages */}
          {messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUser?.id;
            const isSystem = msg.sender_id === 'system';

            /* System Alert / Icebreaker Message */
            if (isSystem) {
              return (
                <div key={msg.id || idx} className="flex justify-center my-2 animate-fade-in">
                  <div className="px-4 py-1.5 rounded-full bg-surface-container text-xs text-on-surface border border-glass-border flex items-center gap-2 font-medium shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{msg.body}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id || msg.client_msg_id || idx}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in group relative`}
              >
                {/* Bubble Row */}
                <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Status Indicator Dot */}
                  <span
                    className={`w-2 h-2 rounded-full mb-2 shrink-0 ${
                      isMe ? 'bg-primary' : 'bg-surface-container-highest'
                    }`}
                  />

                  {/* Message Bubble */}
                  <div
                    data-reaction-container
                    onClick={() => setActiveReactionMsgId((prev) => (prev === msg.id ? null : msg.id))}
                    className={`relative px-4 sm:px-5 py-2.5 sm:py-3 text-[14px] sm:text-[15px] leading-relaxed font-normal cursor-pointer transition-all duration-100 ${
                      isMe
                        ? 'bg-primary text-on-primary rounded-2xl rounded-tr-xs shadow-sm hover:brightness-105'
                        : 'bg-surface-container text-on-surface rounded-2xl rounded-tl-xs shadow-2xs border border-glass-border hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="whitespace-pre-wrap break-words">{msg.body}</span>

                    {/* Applied Emoji Reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(msg.reactions).map(([emoji, users]) => {
                          if (!users || users.length === 0) return null;
                          const userReacted = currentUser && users.includes(currentUser.id);
                          return (
                            <button
                              key={emoji}
                              onClick={(e) => {
                                e.stopPropagation();
                                onReactMessage(msg.id, emoji);
                              }}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                                userReacted
                                  ? 'bg-white/25 border-white/40 text-white font-bold'
                                  : 'bg-black/10 border-black/10 text-inherit'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px]">{users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Floating Reaction Shelf on Bubble Tap/Click */}
                    {activeReactionMsgId === msg.id && (
                      <div
                        className={`absolute -top-10 ${
                          isMe ? 'right-0' : 'left-0'
                        } bg-surface-container-lowest rounded-full px-2 py-1 flex items-center gap-1.5 shadow-elevation-2 border border-glass-border z-30 animate-fade-in`}
                      >
                        {EMOJI_PALETTE.slice(0, 7).map((emoji) => (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              onReactMessage(msg.id, emoji);
                              setActiveReactionMsgId(null);
                            }}
                            className="hover:scale-125 p-0.5 text-sm transition-transform cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamp & Delivery Indicators */}
                <div
                  className={`text-[11px] text-on-surface-variant/80 font-normal mt-1 flex items-center gap-1 ${
                    isMe ? 'pr-4 justify-end' : 'pl-4 justify-start'
                  }`}
                >
                  <span>{formatMessageTime(msg.created_at)}</span>
                  {isMe && (
                    <span title="Delivered">
                      <CheckCheck className="w-3 h-3 text-primary/70 inline" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Opponent Typing Indicator */}
          {opponentTyping && !opponentLeft && (
            <div className="flex items-center gap-2 pl-4 py-1 text-xs text-on-surface-variant animate-fade-in">
              <span className="italic">{opponent?.alias || 'Opponent'} is typing</span>
              <div className="flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-full border border-glass-border">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ════ Icebreaker Prompts Tray ════ */}
      {showPrompts && !opponentLeft && (
        <div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-2 flex flex-wrap items-center gap-1.5 sm:gap-2 animate-fade-in shrink-0">
          <span className="text-xs font-semibold text-on-surface-variant shrink-0 mr-1">Prompts:</span>
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                setInputBody(prompt);
                inputRef.current?.focus();
                setShowPrompts(false);
              }}
              className="bg-surface-container hover:bg-primary hover:text-white border border-glass-border px-3 py-1 rounded-full text-xs text-on-surface font-medium transition-colors cursor-pointer shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* ════ Emoji Popover Picker ════ */}
      {showEmojiPicker && !opponentLeft && (
        <div
          ref={emojiPickerRef}
          className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-1/4 z-40 bg-surface-container-lowest p-3 shadow-elevation-2 border border-glass-border rounded-2xl animate-fade-in w-[min(calc(100vw-2rem),280px)]"
        >
          <div className="grid grid-cols-6 gap-2 text-center">
            {EMOJI_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputBody((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                  inputRef.current?.focus();
                }}
                className="hover:scale-125 p-1 text-lg transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ════ Input Area / Composer Pill ════ */}
      <footer className="w-full bg-surface/85 backdrop-blur-xl border-t border-glass-border px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] shrink-0">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-1.5 sm:gap-2">
          {/* Quick Prompts Toggle */}
          <button
            type="button"
            disabled={Boolean(opponentLeft)}
            onClick={() => setShowPrompts((prev) => !prev)}
            className={`p-2 sm:p-2.5 rounded-full border transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:pointer-events-none ${
              showPrompts
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-glass-border'
            }`}
            title="Conversation Starters"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Pill Composer Input Wrapper */}
          <div
            className={`flex-1 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border transition-all ${
              opponentLeft
                ? 'bg-surface-container-low border-glass-border opacity-60'
                : 'bg-surface-container-lowest border-glass-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15'
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputBody}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={Boolean(opponentLeft)}
              placeholder={
                opponentLeft
                  ? 'Opponent left. Chat closed.'
                  : `Message ${opponent?.alias || 'Opponent'}...`
              }
              className="flex-1 min-w-0 bg-transparent text-on-surface placeholder:text-on-surface-variant/60 text-sm outline-none disabled:cursor-not-allowed"
            />

            {/* Emoji Selector Button */}
            <button
              type="button"
              disabled={Boolean(opponentLeft)}
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="text-on-surface-variant hover:text-on-surface transition-colors p-1 cursor-pointer shrink-0 disabled:opacity-40 disabled:pointer-events-none"
              title="Insert Emoji"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputBody.trim() || Boolean(opponentLeft)}
            className="h-9 sm:h-10 px-3.5 sm:px-5 rounded-full bg-primary hover:bg-primary-container text-on-primary flex items-center gap-1.5 font-medium text-xs sm:text-sm shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
            title="Send Message"
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
};
