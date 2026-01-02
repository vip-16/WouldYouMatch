import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { User, Message } from '../types';
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
  ChevronDown
} from 'lucide-react';

interface PostGameScreenProps {
  vibeScore: number;
  totalRounds: number;
  shareHash?: string;
  opponent: User | null;
  currentUser: User | null;
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
  'Hey There!',
  'How are you?',
  'I am doing well, Can we meet tomorrow?',
  'Why did you pick that one?',
  'Round 3 was wild!',
  'We think way too alike 🔥',
  'Run it back for a rematch! 🎮',
];

const EMOJI_PALETTE = ['👍', '❤️', '😂', '🔥', '😮', '💀', '🎉', '👀', '✨', '🙌', '💯', '🤝'];

export const PostGameScreen: React.FC<PostGameScreenProps> = ({
  vibeScore,
  totalRounds,
  opponent,
  currentUser,
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
  onOpenProfile,
  onOpenReport,
  onOpenShare,
}) => {
  const [inputBody, setInputBody] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
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

  const targetPercentage = Math.round((vibeScore / totalRounds) * 100);

  // Format time matching aesthetic: "Today, 8.30pm"
  const formatMessageTime = useCallback((ts?: number) => {
    const d = ts ? new Date(ts < 1e11 ? ts * 1000 : ts) : new Date();
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const timeStr = `${formattedHours}.${formattedMinutes}${ampm}`;

    return `${isToday ? 'Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  }, []);

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Dismiss dropdowns / popovers on outside click
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
    setInputBody(e.target.value);
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 1800);
  };

  return (
    <div className="flex-1 w-full h-full min-h-[calc(100vh-64px)] flex flex-col bg-background text-on-surface select-text relative">
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

      {/* ════ Website Chat Header ════ */}
      <header className="sticky top-0 z-20 w-full bg-surface/90 backdrop-blur-md border-b border-glass-border px-4 md:px-8 py-3.5 flex items-center justify-between shrink-0 shadow-2xs">
        {/* Left: Opponent Identity & Match Synergy */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={onOpenProfile}
            className="relative cursor-pointer rounded-full shrink-0 group focus:outline-none"
            title="View Profile"
          >
            <Avatar
              alias={opponent?.alias || 'Opponent'}
              size="md"
              showStatus={true}
              statusColor={opponent ? 'online' : 'offline'}
              isGradient={true}
              className="w-10 h-10 border border-glass-border"
            />
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold text-on-surface truncate leading-tight font-display">
                {opponent?.alias || 'Opponent'}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                ✦ {targetPercentage}% Synergy
              </span>
            </div>
            <span className="text-xs text-on-surface-variant leading-tight mt-0.5 font-normal">
              Matched on <strong className="text-on-surface font-semibold">{vibeScore} of {totalRounds}</strong> choices
            </span>
          </div>
        </div>

        {/* Right: Meaningful Website Game Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Friend Connection Action */}
          {connectState === 'mutual' ? (
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Friends</span>
            </span>
          ) : connectState === 'requested' ? (
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant border border-glass-border text-xs font-medium">
              <span>Request Sent</span>
            </span>
          ) : connectState === 'pending' ? (
            <button
              onClick={onConnectRequest}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Accept Friend</span>
            </button>
          ) : (
            <button
              onClick={onConnectRequest}
              className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-glass-border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Add as Friend"
            >
              <UserPlus className="w-3.5 h-3.5 text-on-surface-variant" />
              <span className="hidden sm:inline">Add Friend</span>
            </button>
          )}

          {/* Rematch Action */}
          {rematchState === 'mutual' ? (
            <span className="px-3 py-1.5 rounded-xl bg-primary/15 text-primary border border-primary/30 text-xs font-bold">
              Rematch Active!
            </span>
          ) : rematchState === 'pending' ? (
            <button
              onClick={onRematchRequest}
              className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer animate-pulse"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Accept Rematch</span>
            </button>
          ) : (
            <button
              onClick={onRematchRequest}
              disabled={rematchState === 'requested'}
              className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-glass-border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent hover:border-glass-border transition-colors cursor-pointer"
            title="Share Duel Result"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* More Actions Dropdown (Report, Leave) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowOverflowMenu((prev) => !prev)}
              className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent hover:border-glass-border transition-colors cursor-pointer"
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
                  <span>Leave Duel Room</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ════ Chat Messages Feed (Generous Web Layout with Photo Aesthetic) ════ */}
      <div
        ref={feedContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 min-h-0 relative flex flex-col"
      >
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 flex-1">
          {/* Welcome / Match Completed Banner */}
          <div className="flex flex-col items-center justify-center my-3 text-center text-on-surface-variant">
            <span className="text-[11px] font-mono uppercase tracking-widest text-on-surface-variant/70 mb-1">
              Duel Completed
            </span>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container border border-glass-border text-xs text-on-surface font-medium">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>You and {opponent?.alias || 'Opponent'} matched on {vibeScore} of {totalRounds} questions</span>
            </div>
          </div>

          {/* Render Messages in Reference Aesthetic */}
          {messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUser?.id;
            const isSystem = msg.sender_id === 'system';

            /* System Alert Message */
            if (isSystem) {
              return (
                <div key={msg.id || idx} className="flex justify-center my-2 animate-fade-in">
                  <div className="px-4 py-1 rounded-full bg-surface-container text-xs text-on-surface border border-glass-border flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
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
                {/* Bubble Row with Status Dot */}
                <div className={`flex items-end gap-2.5 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Status Indicator Dot */}
                  <span
                    className={`w-2 h-2 rounded-full mb-2 shrink-0 ${
                      isMe ? 'bg-primary' : 'bg-surface-container-highest'
                    }`}
                  />

                  {/* Message Bubble: Soft ivory/beige for incoming, Crimson Burgundy for outgoing */}
                  <div
                    data-reaction-container
                    onClick={() => setActiveReactionMsgId((prev) => (prev === msg.id ? null : msg.id))}
                    className={`relative px-5 py-3 text-[15px] leading-relaxed font-normal cursor-pointer transition-transform duration-100 ${
                      isMe
                        ? 'bg-primary text-on-primary rounded-2xl rounded-tr-sm shadow-sm'
                        : 'bg-surface-container text-on-surface rounded-2xl rounded-tl-sm shadow-2xs border border-glass-border'
                    }`}
                  >
                    <span>{msg.body}</span>

                    {/* Applied Emoji Reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
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
                                  ? 'bg-white/20 border-white/40 text-white font-bold'
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

                    {/* Floating Reaction Shelf on Click */}
                    {activeReactionMsgId === msg.id && (
                      <div
                        className={`absolute -top-10 ${isMe ? 'right-0' : 'left-0'} bg-surface-container-lowest rounded-full px-2 py-1 flex items-center gap-1.5 shadow-elevation-2 border border-glass-border z-30 animate-fade-in`}
                      >
                        {EMOJI_PALETTE.slice(0, 6).map((emoji) => (
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

                {/* Timestamp below the bubble (e.g. "Today, 8.30pm") */}
                <div
                  className={`text-[11px] text-on-surface-variant font-normal mt-1 ${
                    isMe ? 'pr-4 text-right' : 'pl-4 text-left'
                  }`}
                >
                  {formatMessageTime(msg.created_at)}
                </div>
              </div>
            );
          })}

          {/* Opponent Typing Indicator */}
          {opponentTyping && (
            <div className="flex items-center gap-2 pl-4 py-1 text-xs text-on-surface-variant animate-fade-in">
              <span className="italic">{opponent?.alias || 'Opponent'} is typing</span>
              <div className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-full border border-glass-border">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ════ Icebreaker Prompts Tray (Collapsible & Non-Clipping) ════ */}
      {showPrompts && (
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
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-1/4 z-40 bg-surface-container-lowest p-3 shadow-elevation-2 border border-glass-border rounded-2xl animate-fade-in max-w-xs"
        >
          <div className="grid grid-cols-6 gap-2">
            {EMOJI_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputBody((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                  inputRef.current?.focus();
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-lg transition-transform hover:scale-120 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ════ Website Message Composer ════ */}
      <footer className="sticky bottom-0 z-20 w-full bg-surface/95 backdrop-blur-md border-t border-glass-border px-4 md:px-8 py-4 shrink-0 shadow-2xs">
        <form onSubmit={handleSend} className="w-full max-w-3xl mx-auto flex items-center gap-3">
          {/* Main Input Pill (Aesthetic pill shape spanning width, neutral non-red focus outline) */}
          <div className="flex-1 flex items-center bg-surface-container-low border border-glass-border rounded-2xl md:rounded-full px-4 py-3 focus-within:border-zinc-400 dark:focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-400/20 transition-all">
            {/* Quick Prompts Toggle Button */}
            <button
              type="button"
              onClick={() => setShowPrompts((prev) => !prev)}
              className="text-on-surface-variant hover:text-on-surface transition-colors p-1 cursor-pointer shrink-0"
              title="Pick an icebreaker prompt"
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </button>

            {/* Message Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={inputBody}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 ring-0 focus-visible:outline-none text-sm md:text-base text-on-surface placeholder:text-on-surface-variant/60 px-3 font-normal"
            />

            {/* Emoji Selector Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="text-on-surface-variant hover:text-on-surface transition-colors p-1 cursor-pointer shrink-0"
              title="Insert Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Web Send Button (Crimson Burgundy Accent) */}
          <button
            type="submit"
            disabled={!inputBody.trim()}
            className="px-5 py-3 rounded-2xl md:rounded-full bg-primary hover:bg-primary-container text-on-primary flex items-center gap-2 font-medium text-sm shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
            title="Send Message"
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
};
