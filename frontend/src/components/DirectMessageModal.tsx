import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { ConversationItem, DirectMessage, User, WSFrame } from '../types';
import { wsClient } from '../services/websocket';
import { sounds } from '../services/sound';
import { API_BASE } from '../services/api';
import {
  Smile,
  Send,
  ArrowLeft
} from 'lucide-react';

interface DirectMessageModalProps {
  currentUser: User | null;
  initialFriend?: { id: string; alias?: string; avatar_seed?: string; online?: boolean } | null;
  initialFriendId?: string | null;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
  onChallengeFriend?: (friendId?: string, friendAlias?: string, isOnline?: boolean) => void;
}

const EMOJI_PALETTE = ['👍', '❤️', '😂', '🔥', '😮', '💀', '🎉', '✨'];

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  currentUser,
  initialFriend,
  initialFriendId,
  onClose,
  onOpenProfile,
  onChallengeFriend,
}) => {
  const targetFriendId = initialFriend?.id || initialFriendId;

  // Immediate deterministic conversation fallback for instantaneous load without any glitch
  const initialConv = useMemo<ConversationItem | null>(() => {
    if (!currentUser || !targetFriendId) return null;
    return {
      id: `dm_${[currentUser.id, targetFriendId].sort().join('_')}`,
      friend: {
        id: targetFriendId,
        alias: initialFriend?.alias || 'Friend',
        avatar_seed: initialFriend?.avatar_seed || '',
        online: initialFriend?.online ?? false,
      },
      last_message: null,
      unread_count: 0,
      updated_at: Math.floor(Date.now() / 1000),
    };
  }, [currentUser?.id, targetFriendId, initialFriend?.alias, initialFriend?.avatar_seed, initialFriend?.online]);

  const [conversations, setConversations] = useState<ConversationItem[]>(initialConv ? [initialConv] : []);
  const [selectedConv, setSelectedConv] = useState<ConversationItem | null>(initialConv);
  const [convSearch, setConvSearch] = useState('');
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingConv, setLoadingConv] = useState(!initialConv);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(targetFriendId ? 'chat' : 'list');
  const [friendTyping, setFriendTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Sync if target friend changes
  useEffect(() => {
    if (initialConv) {
      setSelectedConv((prev) => (prev?.friend.id === initialConv.friend.id ? prev : initialConv));
      setMobileView('chat');
    }
  }, [initialConv]);

  // Fetch all user conversations
  const fetchConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/conversations?user_id=${currentUser.id}`);
      let convList: ConversationItem[] = [];
      if (res.ok) {
        const data = await res.json();
        convList = data.conversations || [];
      }

      if (targetFriendId) {
        const match = convList.find((c: ConversationItem) => c.friend.id === targetFriendId);
        if (match) {
          setSelectedConv(match);
          setMobileView('chat');
          setConversations(convList);
        } else if (initialConv) {
          const merged = [initialConv, ...convList.filter((c) => c.id !== initialConv.id)];
          setConversations(merged);
          setSelectedConv(initialConv);
          setMobileView('chat');
        } else {
          try {
            const wfRes = await fetch(
              `${API_BASE}/api/conversations/with_friend?user_id=${currentUser.id}&friend_id=${targetFriendId}`
            );
            if (wfRes.ok) {
              const wfData = await wfRes.json();
              if (wfData.conversation) {
                setConversations([wfData.conversation, ...convList.filter((c) => c.id !== wfData.conversation.id)]);
                setSelectedConv(wfData.conversation);
                setMobileView('chat');
              }
            }
          } catch (e) {
            console.warn('Error fetching conversation with friend:', e);
          }
        }
      } else {
        setConversations(convList);
        if (!selectedConv && convList.length > 0) {
          setSelectedConv(convList[0]);
        }
      }
    } catch (e) {
      console.warn('Error fetching conversations:', e);
    } finally {
      setLoadingConv(false);
    }
  }, [currentUser?.id, targetFriendId, initialConv]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (convId: string) => {
    if (!currentUser?.id) return;
    setLoadingMsgs(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/conversations/${convId}/messages?user_id=${currentUser.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      }
    } catch (e) {
      console.warn('Error fetching DM messages:', e);
    } finally {
      setLoadingMsgs(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
      wsClient.send('dm.read', { conversation_id: selectedConv.id });
    }
  }, [selectedConv, fetchMessages]);

  // Real-time WebSocket subscriptions for DMs
  useEffect(() => {
    const unsubscribe = wsClient.subscribe((frame: WSFrame) => {
      const { type, payload } = frame;

      if (type === 'dm.receive') {
        const newMsg: DirectMessage = payload.message;
        if (newMsg.sender_id === currentUser?.id) {
          setMessages((prev) =>
            prev.map((m) => (m.body === newMsg.body && m.status === 'sending' ? newMsg : m))
          );
          return;
        }

        if (selectedConv && (newMsg.conversation_id === selectedConv.id || newMsg.sender_id === selectedConv.friend.id)) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id || (m.body === newMsg.body && m.sender_id === newMsg.sender_id))) {
              return prev;
            }
            return [...prev, newMsg];
          });
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          wsClient.send('dm.read', { conversation_id: selectedConv.id });
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.friend.id === payload.sender_id
              ? {
                  ...c,
                  last_message: newMsg,
                  unread_count: selectedConv?.id === c.id ? 0 : c.unread_count + 1,
                }
              : c
          )
        );
      } else if (type === 'dm.sent') {
        const sentMsg: DirectMessage = payload.message;
        const clientMsgId = payload.client_msg_id;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === clientMsgId || (m.body === sentMsg.body && m.status === 'sending')
              ? { ...sentMsg, status: 'sent' }
              : m
          )
        );
      } else if (type === 'dm.typing') {
        if (selectedConv && payload.from_user_id === selectedConv.friend.id) {
          setFriendTyping(payload.typing);
        }
      } else if (type === 'dm.reaction.update') {
        if (selectedConv && payload.conversation_id === selectedConv.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.msg_id ? { ...m, reactions: payload.reactions } : m
            )
          );
        }
      }
    });

    return () => unsubscribe();
  }, [selectedConv, currentUser?.id]);

  // Close emoji pickers on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (activeReactionMsgId) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-dm-reaction]')) {
          setActiveReactionMsgId(null);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeReactionMsgId]);

  // Typing emitter
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!selectedConv || !currentUser) return;

    wsClient.send('dm.typing.start', {
      recipient_id: selectedConv.friend.id,
      conversation_id: selectedConv.id,
    });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      wsClient.send('dm.typing.stop', {
        recipient_id: selectedConv.friend.id,
        conversation_id: selectedConv.id,
      });
    }, 1800);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedConv || !currentUser) return;

    const tempId = `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMsg: DirectMessage = {
      id: tempId,
      conversation_id: selectedConv.id,
      sender_id: currentUser.id,
      sender_alias: currentUser.alias,
      body: text,
      created_at: Math.floor(Date.now() / 1000),
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    sounds.playMessageSent();
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    // Send over WS with client_msg_id
    wsClient.send('dm.send', {
      recipient_id: selectedConv.friend.id,
      body: text,
      client_msg_id: tempId,
    });

    // Also persist via HTTP endpoint (with deduplication client_msg_id)
    try {
      const res = await fetch(`${API_BASE}/api/conversations/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUser.id,
          recipient_id: selectedConv.friend.id,
          body: text,
          client_msg_id: tempId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId || (m.body === text && m.status === 'sending')
              ? { ...data.message, status: 'sent' }
              : m
          )
        );
      }
    } catch {
      // Retain optimistic message
    }
  };

  const handleReactMessage = (msgId: string, emoji: string) => {
    if (!selectedConv || !currentUser) return;

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const currentReactions = m.reactions || {};
        const users = currentReactions[emoji] || [];
        const hasReacted = users.includes(currentUser.id);
        const updatedUsers = hasReacted
          ? users.filter((u) => u !== currentUser.id)
          : [...users, currentUser.id];

        const nextReactions = { ...currentReactions };
        if (updatedUsers.length > 0) {
          nextReactions[emoji] = updatedUsers;
        } else {
          delete nextReactions[emoji];
        }

        return { ...m, reactions: nextReactions };
      })
    );

    wsClient.send('dm.react', {
      conversation_id: selectedConv.id,
      msg_id: msgId,
      emoji,
      recipient_id: selectedConv.friend.id,
    });
    setActiveReactionMsgId(null);
  };

  const filteredConversations = useMemo(() => {
    if (!convSearch.trim()) return conversations;
    const q = convSearch.toLowerCase();
    return conversations.filter(
      (c) =>
        c.friend.alias.toLowerCase().includes(q) ||
        (c.last_message && c.last_message.body.toLowerCase().includes(q))
    );
  }, [conversations, convSearch]);

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      maxWidth="2xl"
      className="p-0 overflow-hidden rounded-2xl md:rounded-3xl border border-glass-border shadow-elevation-2 max-w-4xl"
    >
      <div className="flex h-[600px] max-h-[85vh] bg-surface text-on-surface">
        {/* ── Left Sidebar: Conversations List ── */}
        <div
          className={`w-full md:w-80 border-r border-glass-border flex flex-col bg-surface-container-lowest/70 shrink-0 ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-glass-border shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">forum</span>
                <h3 className="font-display font-bold text-base text-on-surface">Messages</h3>
              </div>
              <span className="text-xs font-mono font-bold bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full">
                {conversations.length}
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Search friends…"
                className="w-full bg-surface-container border border-glass-border rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 placeholder:text-on-surface-variant/60"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-glass-border/40">
            {loadingConv ? (
              <div className="p-8 text-center text-xs text-on-surface-variant font-mono">
                Loading…
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant flex flex-col items-center">
                <p className="text-xs font-bold text-on-surface mb-0.5">No Conversations</p>
                <p className="text-[11px] text-on-surface-variant max-w-[180px]">
                  Add friends after a duel to direct message anytime!
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConv?.friend.id === conv.friend.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConv(conv);
                      setMobileView('chat');
                    }}
                    className={`w-full p-3 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-primary'
                        : 'hover:bg-surface-container/50'
                    }`}
                  >
                    <Avatar
                      alias={conv.friend.alias}
                      seed={conv.friend.avatar_seed}
                      size="md"
                      showStatus={true}
                      statusColor={conv.friend.online ? 'online' : 'offline'}
                      isGradient={true}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface truncate">
                          {conv.friend.alias}
                        </span>
                        {conv.last_message && (
                          <span className="text-[9px] font-mono text-on-surface-variant shrink-0">
                            {formatMessageTime(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                        {conv.last_message ? conv.last_message.body : 'Start chatting…'}
                      </p>
                    </div>

                    {conv.unread_count > 0 && (
                      <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat Thread Panel (Website Chat Aesthetics) ── */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-surface-container-lowest ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedConv ? (
            <>
              {/* Active Conversation Header */}
              <div className="h-14 px-4 border-b border-glass-border flex items-center justify-between bg-surface-container-lowest shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden text-on-surface-variant hover:text-on-surface p-1 rounded -ml-1 cursor-pointer"
                    aria-label="Back to messages"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="relative">
                    <Avatar
                      alias={selectedConv.friend.alias}
                      seed={selectedConv.friend.avatar_seed}
                      size="sm"
                      showStatus={false}
                      className="w-9 h-9"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface-container-lowest ${
                        selectedConv.friend.online ? 'bg-emerald-500' : 'bg-zinc-400'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-on-surface truncate leading-tight">
                      {selectedConv.friend.alias}
                    </span>
                    <span className="text-[11px] text-on-surface-variant leading-tight mt-0.5">
                      {selectedConv.friend.online ? 'Online · Active now' : 'Offline · Messages will be delivered'}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5">
                  {onChallengeFriend && (
                    <Button
                      variant="secondary-solid"
                      size="sm"
                      leftIcon="sports_esports"
                      onClick={() => onChallengeFriend(selectedConv.friend.id, selectedConv.friend.alias, selectedConv.friend.online)}
                      className="rounded-lg text-xs py-1 px-2.5"
                    >
                      Duel
                    </Button>
                  )}
                  <Button
                    variant="ghost-icon"
                    size="sm"
                    leftIcon="account_circle"
                    onClick={() => onOpenProfile(selectedConv.friend.id)}
                    aria-label="View Friend Profile"
                  >
                    Profile
                  </Button>
                </div>
              </div>

              {/* Messages Flow Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface/30">
                {loadingMsgs ? (
                  <div className="py-12 text-center text-xs font-mono text-on-surface-variant">
                    Loading messages…
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-on-surface-variant flex flex-col items-center">
                    <p className="text-sm font-semibold text-on-surface mb-0.5">Say Hello</p>
                    <p className="text-xs text-on-surface-variant max-w-xs">
                      Send your message to {selectedConv.friend.alias}! Whenever they are online, they can read and reply.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const isDuelChallenge = msg.body.includes('challenged you to a duel rematch');

                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-fade-in`}
                      >
                        {/* Message Bubble Row */}
                        <div className="flex items-center gap-2 max-w-[85%]">
                          {!isMe && (
                            <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0 self-center" />
                          )}

                          <div
                            data-dm-reaction
                            onClick={() => setActiveReactionMsgId((prev) => (prev === msg.id ? null : msg.id))}
                            className={`relative px-4 py-2.5 text-[14px] leading-relaxed font-normal cursor-pointer transition-transform duration-100 ${
                              isMe
                                ? 'bg-primary text-white rounded-[20px] rounded-tr-md shadow-sm'
                                : 'bg-surface-container text-on-surface rounded-[20px] rounded-tl-md shadow-sm border border-glass-border'
                            }`}
                          >
                            <span>{msg.body}</span>

                            {/* In-Chat Interactive Rematch Challenge */}
                            {isDuelChallenge && !isMe && onChallengeFriend && (
                              <div className="mt-2.5 pt-2 border-t border-glass-border flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-primary">Rematch Ready</span>
                                <Button
                                  variant="primary-gradient"
                                  size="sm"
                                  className="rounded-lg text-xs py-1 px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onChallengeFriend(selectedConv.friend.id, selectedConv.friend.alias, selectedConv.friend.online);
                                  }}
                                >
                                  Accept Duel
                                </Button>
                              </div>
                            )}

                            {/* Reactions */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(msg.reactions).map(([emoji, users]) => {
                                  if (!users || users.length === 0) return null;
                                  return (
                                    <span
                                      key={emoji}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReactMessage(msg.id, emoji);
                                      }}
                                      className="text-xs bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full"
                                    >
                                      {emoji} {users.length}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Floating Reaction Shelf */}
                            <div
                              className={`absolute -top-3.5 ${isMe ? 'right-2' : 'left-2'} ${
                                activeReactionMsgId === msg.id
                                  ? 'opacity-100 pointer-events-auto'
                                  : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
                              } transition-opacity bg-surface-container-lowest rounded-full px-2 py-0.5 flex items-center gap-1 shadow-lg border border-glass-border z-20`}
                            >
                              {EMOJI_PALETTE.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReactMessage(msg.id, emoji);
                                  }}
                                  className="w-5 h-5 flex items-center justify-center hover:scale-125 text-xs transition-transform cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Timestamp & Status */}
                        <div
                          className={`flex items-center gap-1 mt-1 text-[10px] font-mono text-on-surface-variant ${
                            isMe ? 'pr-1' : 'pl-4'
                          }`}
                        >
                          <span>{formatMessageTime(msg.created_at)}</span>
                          {isMe && (
                            <span>
                              {msg.status === 'sending' ? '· Sending…' : '· Sent'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Friend Typing Indicator */}
                {friendTyping && (
                  <div className="flex items-center gap-2 animate-fade-in pl-4">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping shrink-0" />
                    <span className="text-xs text-on-surface-variant italic">
                      {selectedConv.friend.alias} is typing…
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar (Zero red rectangles on focus) */}
              <div className="p-3 border-t border-glass-border bg-surface-container-lowest relative shrink-0">
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-16 right-4 p-2 bg-surface-container-lowest border border-glass-border rounded-xl shadow-elevation-2 z-30"
                  >
                    <div className="grid grid-cols-4 gap-1">
                      {EMOJI_PALETTE.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setInputText((prev) => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="w-7 h-7 flex items-center justify-center hover:scale-120 text-base transition-transform cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2.5">
                  {/* Inner Pill: Neutral clean focus border (NO red rectangle) */}
                  <div className="flex-1 flex items-center bg-surface-container rounded-full px-3.5 py-2 border border-glass-border focus-within:border-zinc-400 dark:focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-400/20 transition-all">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder="Type your message here..."
                      className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-on-surface placeholder:text-on-surface-variant/60 px-2"
                    />

                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
                      title="Add Emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Send Action */}
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center disabled:opacity-40 disabled:hover:bg-primary transition-all shadow-sm cursor-pointer shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-on-surface-variant">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-3">
                <span className="material-symbols-outlined text-[24px]">chat</span>
              </div>
              <p className="text-sm font-bold text-on-surface mb-1">Select a Conversation</p>
              <p className="text-xs text-on-surface-variant max-w-xs">
                Pick a friend on the left to start sending direct messages.
              </p>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};
