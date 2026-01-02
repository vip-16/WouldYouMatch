import React, { useState, useEffect } from 'react';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Chip } from './ui/Chip';
import { PublicProfileData, User } from '../types';
import { API_BASE } from '../services/api';

interface PublicProfileModalProps {
  targetUserId: string;
  currentUser: User | null;
  onClose: () => void;
  onSendFriendRequest: (targetId: string) => void;
  onRematchInvite: (targetId: string) => void;
  onBlockUser: (targetId: string) => void;
  onReportUser: (targetId: string, alias: string) => void;
  onOpenDirectMessage?: (targetId: string, targetAlias?: string, targetAvatar?: string, isOnline?: boolean) => void;
  onRequestUpgrade?: () => void;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  targetUserId,
  currentUser,
  onClose,
  onSendFriendRequest,
  onRematchInvite,
  onBlockUser,
  onReportUser,
  onOpenDirectMessage,
  onRequestUpgrade,
}) => {
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendRequested, setFriendRequested] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [targetUserId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const viewerParam = currentUser?.id ? `?viewer_id=${currentUser.id}` : '';
      const res = await fetch(`${API_BASE}/api/users/${targetUserId}${viewerParam}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        setError('Unable to load player profile');
      }
    } catch {
      setError('Network error fetching profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFriendAction = () => {
    if (currentUser?.is_guest) {
      if (onRequestUpgrade) onRequestUpgrade();
      return;
    }
    onSendFriendRequest(targetUserId);
    setProfile((prev) => prev ? { ...prev, friend_status: 'requested' } : null);
  };

  const getTier = (pct: number | null) => {
    if (pct === null) return { label: 'No Shared Duels', color: 'text-on-surface-variant', bg: 'bg-surface-container' };
    if (pct <= 30) return { label: 'Opposites', color: 'text-on-surface-variant', bg: 'bg-surface-container' };
    if (pct <= 55) return { label: 'Interesting Match', color: 'text-on-surface-variant', bg: 'bg-surface-container-high' };
    if (pct <= 80) return { label: 'High Synergy', color: 'text-primary', bg: 'bg-primary/10' };
    return { label: 'Twin Flames 🔥', color: 'text-primary', bg: 'bg-primary/15' };
  };

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      title="Player Profile"
      maxWidth="md"
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-mono">Loading profile…</span>
        </div>
      ) : error || !profile ? (
        <div className="py-8 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-error text-[32px] mb-2">person_off</span>
          <p className="text-sm">{error || 'User not found'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Header Card */}
          <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-lg border border-glass-border">
            <div className="flex items-center gap-3">
              <Avatar
                alias={profile.alias}
                size="lg"
                showStatus={true}
                statusColor={profile.online ? 'online' : 'offline'}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-lg text-on-surface leading-tight">
                    {profile.alias}
                  </h3>
                  <Chip variant={profile.is_guest ? 'default' : 'primary'} size="sm">
                    {profile.is_guest ? 'Guest' : 'Member'}
                  </Chip>
                </div>
                <span className="text-xs text-on-surface-variant">
                  {profile.stats.total_duels} duels played · {profile.stats.avg_synergy}% career avg
                </span>
              </div>
            </div>

            {/* Friend / Message Action */}
            <div className="flex items-center gap-1.5">
              {profile.friend_status === 'mutual' ? (
                <Button
                  variant="primary-gradient"
                  size="sm"
                  leftIcon="chat"
                  onClick={() => {
                    onClose();
                    if (onOpenDirectMessage) {
                      onOpenDirectMessage(profile.id, profile.alias, profile.avatar_seed, profile.online);
                    }
                  }}
                >
                  Message
                </Button>
              ) : profile.friend_status === 'requested' ? (
                <Chip variant="default" size="sm" icon="schedule">
                  Requested
                </Chip>
              ) : profile.friend_status === 'pending' ? (
                <Button
                  variant="primary-gradient"
                  size="sm"
                  leftIcon="check"
                  onClick={handleFriendAction}
                >
                  Accept Friend
                </Button>
              ) : (
                <Button
                  variant="secondary-solid"
                  size="sm"
                  leftIcon="person_add"
                  onClick={handleFriendAction}
                >
                  Add Friend
                </Button>
              )}
            </div>
          </div>

          {/* Mutual Synergy Hero Block */}
          <div className="bg-surface-container-lowest p-4 rounded-lg border border-glass-border flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-label-md font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <span className="text-primary">✨</span>
                <span>Mutual Synergy with You</span>
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${getTier(profile.mutual_synergy.percentage).bg} ${getTier(profile.mutual_synergy.percentage).color}`}>
                {getTier(profile.mutual_synergy.percentage).label}
              </span>
            </div>

            {profile.mutual_synergy.percentage !== null ? (
              <div className="flex items-center gap-4 mt-1">
                <div className="text-3xl font-display font-bold text-primary">
                  {profile.mutual_synergy.percentage}%
                </div>
                <div className="flex-1">
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                      style={{ width: `${profile.mutual_synergy.percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-on-surface-variant mt-1 block">
                    Based on {profile.mutual_synergy.shared_duels_count} shared 7-choice duels.
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant py-2">
                You haven't played a duel against {profile.alias} yet. Challenge them to test your compatibility!
              </p>
            )}
          </div>

          {/* Shared Duel History */}
          {profile.mutual_synergy.shared_history.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                Shared Duel History
              </span>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                {profile.mutual_synergy.shared_history.map((m) => (
                  <div
                    key={m.match_id}
                    className="flex items-center justify-between p-2.5 rounded-md bg-surface-container border border-glass-border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">sports_esports</span>
                      <span className="font-mono font-bold text-on-surface">
                        {m.vibe_score}/{m.total_rounds} Matched
                      </span>
                    </div>
                    <span className="text-on-surface-variant font-mono text-[11px]">
                      {new Date(m.created_at * 1000).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions: Rematch, Block, Report */}
          <div className="flex items-center justify-between pt-3 border-t border-glass-border">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Block ${profile.alias}? You will not be matched again and messaging will be disabled.`)) {
                    onBlockUser(profile.id);
                    onClose();
                  }
                }}
                className="text-xs font-body-md text-on-surface-variant hover:text-error transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">block</span>
                <span>Block</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReportUser(profile.id, profile.alias);
                }}
                className="text-xs font-body-md text-on-surface-variant hover:text-error transition-colors flex items-center gap-1 cursor-pointer ml-3"
              >
                <span className="material-symbols-outlined text-[15px]">report</span>
                <span>Report</span>
              </button>
            </div>

            <Button
              variant="secondary-solid"
              size="sm"
              leftIcon="replay"
              onClick={() => {
                onClose();
                onRematchInvite(profile.id);
              }}
            >
              Challenge to Duel
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
};
