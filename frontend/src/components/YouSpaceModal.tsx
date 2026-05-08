import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User as UserIcon, Users, UserPlus, History as HistoryIcon, BarChart3 } from 'lucide-react';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Chip } from './ui/Chip';
import { User, Friend, FriendRequestsData, MatchHistoryItem, UserStats } from '../types';
import { apiFetch } from '../services/api';

interface YouSpaceModalProps {
  currentUser: User | null;
  initialTab?: 'profile' | 'friends' | 'requests' | 'history' | 'stats';
  onClose: () => void;
  onUpdateUser: (updated: User) => void;
  onOpenUpgrade: () => void;
  onOpenPublicProfile: (userId: string) => void;
  onOpenDirectMessage: (friendId: string, friendAlias?: string, friendAvatar?: string, isOnline?: boolean) => void;
  onChallengeFriend: (friendId?: string, friendAlias?: string, isOnline?: boolean) => void;
  onLogout?: () => void;
}

const AVATAR_OPTIONS = [
  { id: 'seed_cosmic', label: 'Cosmic Coral', gradient: 'from-[#eb5432] to-[#ff7e5f]' },
  { id: 'seed_neon', label: 'Neon Violet', gradient: 'from-[#6d28d9] to-[#9061f9]' },
  { id: 'seed_emerald', label: 'Emerald Jade', gradient: 'from-[#047857] to-[#10b981]' },
  { id: 'seed_solar', label: 'Solar Amber', gradient: 'from-[#d97706] to-[#fbbf24]' },
  { id: 'seed_velvet', label: 'Rose Velvet', gradient: 'from-[#db2777] to-[#f472b6]' },
];

export const YouSpaceModal: React.FC<YouSpaceModalProps> = ({
  currentUser,
  initialTab = 'profile',
  onClose,
  onUpdateUser,
  onOpenUpgrade,
  onOpenPublicProfile,
  onOpenDirectMessage,
  onChallengeFriend,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'friends' | 'requests' | 'history' | 'stats'>(initialTab);
  
  // Profile editing (display name is locked, only avatar can be selected)
  const [avatarSeed, setAvatarSeed] = useState(currentUser?.avatar_seed || 'seed_cosmic');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [challengeNotices, setChallengeNotices] = useState<{ [friendId: string]: string }>({});

  // Social & Stats state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [requests, setRequests] = useState<FriendRequestsData>({ incoming: [], outgoing: [] });
  const [requestsSubTab, setRequestsSubTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const fetchSocialData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingData(true);
    try {
      const [friendsRes, reqsRes, historyRes, statsRes] = await Promise.all([
        apiFetch(`/api/friends?user_id=${currentUser.id}`),
        apiFetch(`/api/friends/requests?user_id=${currentUser.id}`),
        apiFetch(`/api/me/history?user_id=${currentUser.id}`),
        apiFetch(`/api/me/stats?user_id=${currentUser.id}`),
      ]);

      if (friendsRes.ok) {
        const d = await friendsRes.json();
        setFriends(d.friends || []);
      }
      if (reqsRes.ok) {
        const d = await reqsRes.json();
        setRequests(d || { incoming: [], outgoing: [] });
      }
      if (historyRes.ok) {
        const d = await historyRes.json();
        setHistory(d.history || []);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
    } catch (e) {
      console.warn('Error loading You space data:', e);
    } finally {
      setLoadingData(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchSocialData();
  }, [fetchSocialData]);

  const handleCopyHandle = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wouldyoumatch.app';
    const handle = `${origin}/u/${(currentUser?.alias || 'user').toLowerCase()}`;
    navigator.clipboard.writeText(handle);
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser?.id) return;

    setSavingProfile(true);
    try {
      const res = await apiFetch(`/api/me/profile`, {
        method: 'PATCH',
        body: JSON.stringify({
          user_id: currentUser.id,
          avatar_seed: avatarSeed,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onUpdateUser({ ...currentUser, avatar_seed: data.user.avatar_seed });
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 2500);
      }
    } catch (e) {
      console.error('Error updating avatar:', e);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRespondRequest = async (requesterId: string, action: 'accept' | 'ignore') => {
    if (!currentUser?.id) return;
    try {
      const res = await apiFetch(`/api/friends/respond`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: currentUser.id,
          target_user_id: requesterId,
          action,
        }),
      });
      if (res.ok) {
        fetchSocialData();
      }
    } catch (e) {
      console.error('Error responding to friend request:', e);
    }
  };

  const filteredFriends = useMemo(() => {
    return friends.filter((f) =>
      f.alias.toLowerCase().includes(friendSearch.toLowerCase())
    );
  }, [friends, friendSearch]);

  const filteredHistory = useMemo(() => {
    return history.filter((h) =>
      h.opponent.alias.toLowerCase().includes(historySearch.toLowerCase())
    );
  }, [history, historySearch]);

  const currentAuraGradient = useMemo(() => {
    return AVATAR_OPTIONS.find((p) => p.id === avatarSeed)?.gradient || 'from-[#eb5432] to-[#ff7e5f]';
  }, [avatarSeed]);

  return (
    <ModalShell isOpen={true} onClose={onClose} maxWidth="2xl">
      <div className="flex flex-col gap-4 text-left">
        
        {/* ── Sleek Integrated Header (No Double Headers) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-glass-border pr-12">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shadow-elevation-1 shrink-0 p-1">
              <img src="/logo.png" alt="WouldYouMatch?" className="w-full h-full object-contain filter drop-shadow-[0_1px_4px_rgba(224,49,49,0.35)]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-lg text-on-surface leading-none">
                  Profile
                </h2>
                {currentUser?.is_guest ? (
                  <span className="text-[10px] font-mono font-bold bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full border border-glass-border">
                    Guest
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                    ⭐ Member
                  </span>
                )}
              </div>
              <span className="text-[11px] font-body-md text-on-surface-variant truncate block">
                Identity, connections, and personal archetype.
              </span>
            </div>
          </div>

          {/* Compact Guest Upgrade Action (Sleek Pill Instead of Huge Banner) */}
          {currentUser?.is_guest && (
            <button
              onClick={() => {
                onClose();
                onOpenUpgrade();
              }}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-label-md font-bold transition-all cursor-pointer shrink-0"
            >
              <span>Save Account</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          )}
        </div>

        {/* ── Segmented Pill Tab Bar (Full Title Visibility, Sleek Lucide Icons & Responsive Badges) ── */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 bg-surface-container/60 p-1.5 rounded-xl border border-glass-border w-full">
          {[
            { id: 'profile', label: 'Profile', icon: UserIcon, count: null },
            { id: 'friends', label: 'Friends', icon: Users, count: friends.length },
            { id: 'requests', label: 'Requests', icon: UserPlus, count: requests.incoming.length > 0 ? requests.incoming.length : null },
            { id: 'history', label: 'History', icon: HistoryIcon, count: history.length > 0 ? history.length : null },
            { id: 'stats', label: 'Stats', icon: BarChart3, count: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                title={tab.label}
                className={`w-full min-w-0 flex items-center justify-center gap-1.5 px-2 py-2 sm:py-2.5 rounded-lg text-xs font-label-md transition-all cursor-pointer ${
                  isActive
                    ? 'bg-surface-container-lowest text-primary font-bold shadow-elevation-1 border border-primary/25 ring-1 ring-primary/20'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-110 text-primary' : 'text-on-surface-variant'}`} />
                <span className="whitespace-nowrap text-xs font-semibold">{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 1: PROFILE (Symmetric & Aesthetic Identity Card)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <form key="tab-profile" onSubmit={handleSaveProfile} className="flex flex-col items-center gap-4 animate-tab-fade py-1">
            
            {/* Symmetrical Profile Identity Card */}
            <div className="w-full rounded-2xl border border-glass-border bg-surface-container-lowest p-6 shadow-elevation-1 flex flex-col items-center text-center relative overflow-hidden">
              
              {/* Subtle ambient background glow */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              {/* Centered Avatar Display */}
              <div className="relative group mb-3">
                <div className="p-1 rounded-full bg-gradient-to-tr from-primary/40 via-accent/30 to-primary/20 shadow-elevation-2 transition-transform duration-300 group-hover:scale-105">
                  <Avatar alias={currentUser?.alias || 'You'} seed={avatarSeed} size="xl" isGradient={true} />
                </div>
              </div>

              {/* Fixed Display Name / Username */}
              <div className="flex items-center justify-center gap-2">
                <h3 className="font-display font-bold text-xl text-on-surface">
                  {currentUser?.alias || 'Player'}
                </h3>
                {currentUser?.is_guest ? (
                  <span className="text-[10px] font-mono font-bold bg-surface-container text-on-surface-variant px-2.5 py-0.5 rounded-full border border-glass-border">
                    Guest
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold bg-primary/15 text-primary px-2.5 py-0.5 rounded-full border border-primary/25">
                    ⭐ Member
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center gap-1.5 mt-1 text-xs text-on-surface-variant font-mono">
                <span className="material-symbols-outlined text-[13px]">lock</span>
                <span>Username is fixed</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleCopyHandle}
                  className="text-primary hover:underline cursor-pointer"
                >
                  wouldyoumatch.app/u/{(currentUser?.alias || 'user').toLowerCase()} {copiedHandle ? '(Copied!)' : ''}
                </button>
              </div>

              {/* Guest Upgrade Prompt or Registered Sign Out Action */}
              {currentUser?.is_guest ? (
                <div className="w-full mt-3.5 p-3 rounded-xl bg-gradient-to-r from-primary/15 via-accent/10 to-primary/10 border border-primary/25 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="text-left">
                    <span className="text-xs font-bold text-on-surface block">Save Your History & Friends</span>
                    <span className="text-[11px] text-on-surface-variant">Upgrade your guest account to a permanent profile anytime.</span>
                  </div>
                  <Button
                    variant="primary-gradient"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenUpgrade();
                    }}
                    className="text-xs font-bold shrink-0 py-1.5 px-3 rounded-full"
                  >
                    Upgrade Free
                  </Button>
                </div>
              ) : (
                <div className="w-full mt-3.5 p-2.5 rounded-xl bg-surface-container/60 border border-glass-border flex items-center justify-between">
                  <div className="text-left text-xs font-mono">
                    <span className="text-on-surface font-bold block">{currentUser?.email || currentUser?.username}</span>
                    <span className="text-on-surface-variant text-[10px]">Active Registered Account</span>
                  </div>
                  {onLogout && (
                    <Button
                      variant="ghost-icon"
                      size="sm"
                      onClick={() => {
                        onClose();
                        onLogout();
                      }}
                      className="text-xs text-error hover:bg-error/10 font-bold px-3 py-1 rounded-lg"
                    >
                      Sign Out
                    </Button>
                  )}
                </div>
              )}

              {/* Symmetric 5-Avatar Selection Section */}
              <div className="w-full mt-5 pt-4 border-t border-glass-border/60">
                <span className="text-xs font-label-md font-bold uppercase tracking-wider text-on-surface-variant block mb-3">
                  Choose Avatar Style
                </span>

                <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
                  {AVATAR_OPTIONS.map((opt) => {
                    const isSelected = avatarSeed === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAvatarSeed(opt.id)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-primary/10 ring-2 ring-primary scale-105 shadow-elevation-1'
                            : 'hover:bg-surface-container/60 hover:scale-102 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="relative">
                          <Avatar alias={currentUser?.alias || 'Player'} seed={opt.id} size="md" isGradient={true} />
                          {isSelected && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-[10px] shadow-sm">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-medium transition-colors ${
                          isSelected ? 'text-primary font-bold' : 'text-on-surface-variant group-hover:text-on-surface'
                        }`}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Symmetrical Stats Overview */}
              <div className="w-full grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-glass-border/60">
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container/50 border border-glass-border">
                  <span className="text-lg font-display font-bold text-on-surface">
                    {stats?.total_duels || 0}
                  </span>
                  <span className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wider">
                    Duels Played
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container/50 border border-glass-border">
                  <span className="text-lg font-display font-bold text-primary">
                    {stats?.avg_synergy || 0}%
                  </span>
                  <span className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wider">
                    Career Vibe
                  </span>
                </div>
              </div>

              {/* Save Avatar Button */}
              <div className="mt-5 flex flex-col items-center gap-2">
                <Button
                  variant="primary-gradient"
                  size="md"
                  type="submit"
                  isLoading={savingProfile}
                  className="rounded-full px-8 py-2 text-xs font-bold"
                >
                  Save Avatar
                </Button>
                {profileSuccess && (
                  <span className="text-xs font-mono text-tertiary font-bold animate-fade-in">
                    ✓ Avatar updated successfully
                  </span>
                )}
              </div>

            </div>
          </form>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 2: FRIENDS (Clean Search & Connections List)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'friends' && (
          <div key="tab-friends" className="flex flex-col gap-3 animate-tab-fade">
            
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant absolute left-3 top-2.5 pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="Search friends by name…"
                className="w-full bg-surface-container/50 border border-glass-border rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50 font-body-md"
              />
            </div>

            {/* Friend List Content */}
            {friends.length === 0 ? (
              <div className="py-16 text-center text-on-surface-variant flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary mb-2.5">
                  <span className="material-symbols-outlined text-[24px]">group_add</span>
                </div>
                <p className="text-sm font-bold text-on-surface mb-1">No Friends Yet</p>
                <p className="text-xs text-on-surface-variant max-w-xs mb-4">
                  Send friend requests in post-game duel chat to build your connection list!
                </p>
                <Button
                  variant="primary-gradient"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onChallengeFriend('');
                  }}
                  leftIcon="sports_esports"
                  className="rounded-full"
                >
                  Find a Match
                </Button>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="py-12 text-center text-xs text-on-surface-variant">
                No friends matching "{friendSearch}"
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-glass-border hover:border-glass-border-hover transition-all"
                  >
                    <div
                      className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                      onClick={() => {
                        onClose();
                        onOpenPublicProfile(friend.id);
                      }}
                    >
                      <Avatar
                        alias={friend.alias}
                        size="md"
                        showStatus={true}
                        statusColor={friend.online ? 'online' : 'offline'}
                        isGradient={true}
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-on-surface truncate">
                            {friend.alias}
                          </span>
                          {friend.mutual_synergy_pct !== null && (
                            <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.2 rounded-full shrink-0">
                              {friend.mutual_synergy_pct}% Vibe
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          {friend.online ? '● Online' : 'Offline'} · {friend.shared_matches_count} shared duels
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="primary-gradient"
                          size="sm"
                          leftIcon="chat"
                          onClick={() => {
                            onClose();
                            onOpenDirectMessage(friend.id, friend.alias, friend.avatar_seed, friend.online);
                          }}
                          className="rounded-lg text-xs py-1"
                        >
                          Chat
                        </Button>
                        <Button
                          variant="secondary-solid"
                          size="sm"
                          leftIcon="sports_esports"
                          onClick={() => {
                            onChallengeFriend(friend.id, friend.alias, friend.online);
                            setChallengeNotices((prev) => ({
                              ...prev,
                              [friend.id]: friend.online
                                ? '⚔️ Challenge sent!'
                                : '⚔️ Sent to friend inbox!',
                            }));
                            setTimeout(() => {
                              setChallengeNotices((prev) => {
                                const copy = { ...prev };
                                delete copy[friend.id];
                                return copy;
                              });
                            }, 3500);
                          }}
                          className="rounded-lg text-xs py-1"
                        >
                          Duel
                        </Button>
                      </div>
                      {challengeNotices[friend.id] && (
                        <span className="text-[10px] font-mono text-primary font-bold animate-fade-in">
                          {challengeNotices[friend.id]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 3: REQUESTS (Clean Toggle & Simple Rows)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'requests' && (
          <div key="tab-requests" className="flex flex-col gap-3 animate-tab-fade">
            
            {/* Sub-tab pills */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRequestsSubTab('incoming')}
                className={`px-3 py-1 rounded-full text-xs font-label-md font-bold transition-all cursor-pointer ${
                  requestsSubTab === 'incoming'
                    ? 'bg-primary text-white shadow-elevation-1'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Incoming ({requests.incoming.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestsSubTab('outgoing')}
                className={`px-3 py-1 rounded-full text-xs font-label-md font-bold transition-all cursor-pointer ${
                  requestsSubTab === 'outgoing'
                    ? 'bg-primary text-white shadow-elevation-1'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Outgoing ({requests.outgoing.length})
              </button>
            </div>

            {requestsSubTab === 'incoming' && (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {requests.incoming.length === 0 ? (
                  <div className="py-16 text-center text-on-surface-variant flex flex-col items-center">
                    <span className="material-symbols-outlined text-[28px] text-on-surface-variant/30 mb-1.5">
                      inbox
                    </span>
                    <p className="text-xs">No pending incoming friend requests.</p>
                  </div>
                ) : (
                  requests.incoming.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-glass-border"
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => {
                          onClose();
                          onOpenPublicProfile(req.id);
                        }}
                      >
                        <Avatar alias={req.alias} size="md" isGradient={true} />
                        <div className="flex flex-col">
                          <span className="font-display font-bold text-xs text-on-surface">
                            {req.alias}
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            Wants to connect
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="primary-gradient"
                          size="sm"
                          leftIcon="check"
                          onClick={() => handleRespondRequest(req.id, 'accept')}
                          className="rounded-lg text-xs py-1"
                        >
                          Accept
                        </Button>
                        <Button
                          variant="secondary-solid"
                          size="sm"
                          onClick={() => handleRespondRequest(req.id, 'ignore')}
                          className="rounded-lg text-xs py-1"
                        >
                          Ignore
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {requestsSubTab === 'outgoing' && (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {requests.outgoing.length === 0 ? (
                  <div className="py-16 text-center text-on-surface-variant flex flex-col items-center">
                    <span className="material-symbols-outlined text-[28px] text-on-surface-variant/30 mb-1.5">
                      send
                    </span>
                    <p className="text-xs">No outgoing friend requests pending.</p>
                  </div>
                ) : (
                  requests.outgoing.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-glass-border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar alias={req.alias} size="sm" />
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-on-surface">{req.alias}</span>
                          <span className="text-[10px] text-on-surface-variant font-mono">Awaiting their response</span>
                        </div>
                      </div>
                      <Chip variant="default" size="sm" icon="schedule">
                        Pending
                      </Chip>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 4: HISTORY (Expandable Duel Match Cards)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div key="tab-history" className="flex flex-col gap-3 animate-tab-fade">
            
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant absolute left-3 top-2.5 pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search duel history by opponent…"
                className="w-full bg-surface-container/50 border border-glass-border rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50 font-body-md"
              />
            </div>

            {/* Match List */}
            {history.length === 0 ? (
              <div className="py-16 text-center text-on-surface-variant flex flex-col items-center">
                <span className="material-symbols-outlined text-[28px] text-on-surface-variant/30 mb-1.5">
                  sports_esports
                </span>
                <p className="text-sm font-bold text-on-surface mb-1">No Duels Yet</p>
                <p className="text-xs text-on-surface-variant max-w-xs mb-3">
                  Match with someone to record your first 7-choice compatibility breakdown!
                </p>
                <Button
                  variant="primary-gradient"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onChallengeFriend('');
                  }}
                  className="rounded-full"
                >
                  Start a Duel
                </Button>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-on-surface-variant">
                No past matches with "{historySearch}"
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                {filteredHistory.map((m) => {
                  const isExpanded = expandedMatchId === m.match_id;
                  return (
                    <div
                      key={m.match_id}
                      className="rounded-xl border border-glass-border bg-surface-container-lowest overflow-hidden transition-all"
                    >
                      <div
                        onClick={() => setExpandedMatchId(isExpanded ? null : m.match_id)}
                        className="p-3 flex items-center justify-between hover:bg-surface-container/40 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar alias={m.opponent.alias} size="sm" isGradient={true} />
                          <div className="flex flex-col">
                            <span className="font-display font-bold text-xs text-on-surface">
                              vs {m.opponent.alias}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-mono">
                              {new Date(m.created_at < 1e11 ? m.created_at * 1000 : m.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-primary">
                            {m.vibe_score}/{m.total_rounds} Matched
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {m.synergy_pct}%
                          </span>
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </div>

                      {/* Expandable 7-Round Details */}
                      {isExpanded && m.rounds && (
                        <div className="p-3 bg-surface-container/30 border-t border-glass-border flex flex-col gap-2 animate-fade-in">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant">
                            Dilemma Breakdown:
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {m.rounds.map((r) => (
                              <div
                                key={r.round}
                                className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-container-lowest border border-glass-border/60"
                              >
                                <span className="font-mono text-[10px] text-on-surface-variant">
                                  R{r.round}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-on-surface">
                                    You: {r.user_choice === 'left' ? 'Option A' : 'Option B'}
                                  </span>
                                  <span className="text-on-surface-variant text-[10px]">·</span>
                                  <span className="text-[11px] text-on-surface-variant">
                                    Them: {r.opponent_choice === 'left' ? 'Option A' : 'Option B'}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${r.agreed ? 'bg-tertiary/15 text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
                                  {r.agreed ? '✓ Match' : '✕ Split'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 5: STATS & VIBE (Clean Archetype & Harmony Analytics)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <div key="tab-stats" className="flex flex-col gap-3 animate-tab-fade">
            
            {/* Personality Archetype Hero Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-surface-container to-accent/10 border border-primary/20 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                  ✦ Psychological Archetype
                </span>
                <span className="text-[10px] font-mono font-bold text-tertiary">
                  Dynamic Metric
                </span>
              </div>
              <h3 className="font-display font-bold text-xl text-on-surface">
                {stats?.vibe_archetype || '⚡ Twin Flame Magnet'}
              </h3>
              <p className="text-xs font-body-md text-on-surface-variant leading-relaxed">
                {stats?.archetype_quote || 'You exhibit high harmonic alignment with online players, consistently finding mutual ground on absurd and complex dilemmas.'}
              </p>
            </div>

            {/* 4 Metric Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="bg-surface-container-lowest p-3 rounded-xl border border-glass-border">
                <span className="font-display font-bold text-lg text-primary block">
                  {stats?.total_duels || 0}
                </span>
                <span className="text-[10px] font-label-md text-on-surface-variant uppercase font-bold">
                  Duels
                </span>
              </div>
              <div className="bg-surface-container-lowest p-3 rounded-xl border border-glass-border">
                <span className="font-display font-bold text-lg text-accent block">
                  {stats?.avg_synergy || 0}%
                </span>
                <span className="text-[10px] font-label-md text-on-surface-variant uppercase font-bold">
                  Avg Vibe
                </span>
              </div>
              <div className="bg-surface-container-lowest p-3 rounded-xl border border-glass-border">
                <span className="font-display font-bold text-lg text-tertiary block">
                  {stats?.best_synergy || 0}%
                </span>
                <span className="text-[10px] font-label-md text-on-surface-variant uppercase font-bold">
                  Top Match
                </span>
              </div>
              <div className="bg-surface-container-lowest p-3 rounded-xl border border-glass-border">
                <span className="font-display font-bold text-lg text-on-surface block">
                  {stats?.current_streak || 0} 🔥
                </span>
                <span className="text-[10px] font-label-md text-on-surface-variant uppercase font-bold">
                  Streak
                </span>
              </div>
            </div>

            {/* Dilemma Agreement Ratio Bar */}
            <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-glass-border flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-label-md">
                <span className="text-on-surface font-bold">Total Choice Alignment</span>
                <span className="font-mono text-primary font-bold">
                  {stats?.agreed_rounds_count || 0} Matched / {stats?.disagreed_rounds_count || 0} Split
                </span>
              </div>
              
              <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden flex">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{
                    width: `${
                      (stats?.agreed_rounds_count || 0) + (stats?.disagreed_rounds_count || 0) > 0
                        ? Math.round(
                            ((stats?.agreed_rounds_count || 0) /
                              ((stats?.agreed_rounds_count || 0) + (stats?.disagreed_rounds_count || 0))) *
                              100
                          )
                        : 50
                    }%`,
                  }}
                />
                <div className="h-full bg-surface-container-highest flex-1" />
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
