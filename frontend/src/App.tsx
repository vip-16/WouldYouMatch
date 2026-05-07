import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { LandingScreen } from './components/LandingScreen';
import { QueueScreen } from './components/QueueScreen';
import { GameScreen } from './components/GameScreen';
import { PostGameScreen } from './components/PostGameScreen';
import { YouSpaceModal } from './components/YouSpaceModal';
import { PublicProfileModal } from './components/PublicProfileModal';
import { DirectMessageModal } from './components/DirectMessageModal';
import { AccountUpgradeModal } from './components/AccountUpgradeModal';
import { ReportModal } from './components/ReportModal';
import { ShareModal } from './components/ShareModal';
import { Banner } from './components/ui/Banner';
import { Button } from './components/ui/Button';
import { Avatar } from './components/ui/Avatar';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { TermsOfServiceModal } from './components/TermsOfServiceModal';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { NotFoundScreen } from './components/NotFoundScreen';
import { trackPageView } from './services/analytics';
import { User, Question, RoundResult, Message, AppStage, WSFrame } from './types';
import { wsClient } from './services/websocket';
import { sounds } from './services/sound';
import { API_BASE, apiFetch, setAuthToken, clearAuthToken } from './services/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [stage, setStage] = useState<AppStage>('landing');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected'>('idle');
  const [unreadDMCount, setUnreadDMCount] = useState<number>(0);
  
  // Game State
  const [matchId, setMatchId] = useState<string | null>(null);
  const [shareHash, setShareHash] = useState<string>('');
  const [opponent, setOpponent] = useState<User | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(7);
  const [question, setQuestion] = useState<Question | null>(null);
  const [opponentAnswered, setOpponentAnswered] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [vibeScore, setVibeScore] = useState<number>(0);

  // Chat & Social State
  const [messages, setMessages] = useState<Message[]>([]);
  const [opponentTyping, setOpponentTyping] = useState<boolean>(false);
  const [connectState, setConnectState] = useState<'none' | 'requested' | 'pending' | 'mutual'>('none');
  const [rematchState, setRematchState] = useState<'none' | 'requested' | 'pending' | 'mutual'>('none');

  // Duel Challenge & Toast Notifications
  const [incomingChallenge, setIncomingChallenge] = useState<{
    challengeId: string;
    challenger: { id: string; alias: string; avatar_seed?: string };
  } | null>(null);
  const [challengeNotice, setChallengeNotice] = useState<string | null>(null);

  // Modals
  const [showYouSpace, setShowYouSpace] = useState<boolean>(false);
  const [youSpaceTab, setYouSpaceTab] = useState<'profile' | 'friends' | 'requests' | 'history' | 'stats'>('profile');
  const [publicProfileTargetId, setPublicProfileTargetId] = useState<string | null>(null);
  const [showDirectMessages, setShowDirectMessages] = useState<boolean>(false);
  const [activeDMFriendId, setActiveDMFriendId] = useState<string | null>(null);
  const [activeDMFriend, setActiveDMFriend] = useState<{ id: string; alias?: string; avatar_seed?: string; online?: boolean } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; alias: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState<boolean>(false);
  const [showTerms, setShowTerms] = useState<boolean>(false);
  const [showCookieSettings, setShowCookieSettings] = useState<boolean>(false);
  const [is404, setIs404] = useState<boolean>(false);

  // WebSocket callbacks are intentionally stable. Keep the values they need
  // in refs so a frame can never observe an old match or round after React
  // re-renders.
  const userRef = useRef<User | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const currentRoundRef = useRef<number>(1);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  // Dark Mode toggle
  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('wouldyoumatch_theme', 'dark');
      localStorage.setItem('wyrmg_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('wouldyoumatch_theme', 'light');
      localStorage.setItem('wyrmg_theme', 'light');
    }
  };

  // Path-based URL routing & Canonical Titles
  const handleLocationChange = useCallback(() => {
    const rawPath = window.location.pathname.toLowerCase();
    const path = rawPath.replace(/\/$/, '') || '/';
    trackPageView(path);

    if (path === '' || path === '/' || path === '/arena') {
      setIs404(false);
      setShowPrivacyPolicy(false);
      setShowTerms(false);
      document.title = 'WouldYouMatch? — Real-time Social Match & Dilemma Duels';
    } else if (path === '/privacy-policy') {
      setIs404(false);
      setShowPrivacyPolicy(true);
      setShowTerms(false);
      document.title = 'Privacy Policy — WouldYouMatch?';
    } else if (path === '/terms' || path === '/terms-and-conditions') {
      setIs404(false);
      setShowTerms(true);
      setShowPrivacyPolicy(false);
      document.title = 'Terms of Service — WouldYouMatch?';
    } else if (path.startsWith('/share/')) {
      setIs404(false);
    } else {
      setIs404(true);
      document.title = '404: Page Not Found — WouldYouMatch?';
    }
  }, []);

  useEffect(() => {
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [handleLocationChange]);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    handleLocationChange();
  };

  const navigateHome = () => {
    navigateTo('/');
  };

  const handleCloseLegal = () => {
    setShowPrivacyPolicy(false);
    setShowTerms(false);
    if (window.location.pathname !== '/' && window.location.pathname !== '') {
      window.history.pushState({}, '', '/');
      document.title = 'WouldYouMatch? — Real-time Social Match & Dilemma Duels';
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('wouldyoumatch_theme') || localStorage.getItem('wyrmg_theme');
    const isDark = savedTheme !== null ? savedTheme === 'dark' : true;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    fetchInitialUser();
  }, []);

  const fetchInitialUser = async () => {
    // Guests are per-tab. localStorage is shared by every tab on a device,
    // which previously made two guest tabs impersonate the same player.
    const sessionGuestId = sessionStorage.getItem('wyrmg_guest_user_id');
    const savedUserId = sessionGuestId || localStorage.getItem('wouldyoumatch_user_id') || localStorage.getItem('wyrmg_user_id');
    if (savedUserId) {
      try {
        const res = await apiFetch(`/api/me?user_id=${savedUserId}`);
        if (res.ok) {
          const data = await res.json();
          // A legacy localStorage guest must not be reused in a newly opened
          // tab. Registered identities remain persistent across tabs.
          if (!data.is_guest || sessionGuestId) {
            setUser(data);
            setUnreadDMCount(data.total_unread_messages || 0);
            return;
          }
        }
      } catch (e) {
        console.warn('Could not restore saved session, creating fresh:', e);
      }
    }

    try {
      const res = await apiFetch(`/api/auth/guest`, {
        method: 'POST',
        body: JSON.stringify({ device_fingerprint: 'browser_fp_123' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) setAuthToken(data.access_token);
        setUser(data.user);
        sessionStorage.setItem('wyrmg_guest_user_id', data.user.id);
        refreshUserProfile(data.user.id);
      } else {
        createLocalUser();
      }
    } catch {
      createLocalUser();
    }
  };

  const refreshUserProfile = async (userId: string) => {
    try {
      const res = await apiFetch(`/api/me?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setUnreadDMCount(data.total_unread_messages || 0);
      }
    } catch (e) {
      console.warn('Error refreshing user profile:', e);
    }
  };

  const createLocalUser = () => {
    const localId = `usr_${Math.random().toString(36).substring(2, 10)}`;
    const adjectives = ['Cosmic', 'Neon', 'Velvet', 'Electric', 'Solar'];
    const nouns = ['Pickle', 'Vortex', 'Wanderer', 'Otter', 'Panda'];
    const alias = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 90 + 10)}`;
    setUser({ id: localId, alias, avatar_seed: `seed_${localId}`, role: 'user', is_guest: true });
    sessionStorage.setItem('wyrmg_guest_user_id', localId);
  };

  const handleLogout = async () => {
    clearAuthToken();
    localStorage.removeItem('wouldyoumatch_user_id');
    localStorage.removeItem('wyrmg_user_id');
    sessionStorage.removeItem('wyrmg_guest_user_id');
    setShowYouSpace(false);
    try {
      const res = await apiFetch(`/api/auth/guest`, {
        method: 'POST',
        body: JSON.stringify({ device_fingerprint: `fp_${Date.now()}` }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) setAuthToken(data.access_token);
        setUser(data.user);
        sessionStorage.setItem('wyrmg_guest_user_id', data.user.id);
        refreshUserProfile(data.user.id);
      } else {
        createLocalUser();
      }
    } catch {
      createLocalUser();
    }
  };

  const getWsTicket = useCallback(async (): Promise<string> => {
    const activeUser = userRef.current;
    if (!activeUser) throw new Error('No active user');
    const res = await apiFetch(`/api/ws/ticket`, {
      method: 'POST',
      body: JSON.stringify({ user_id: activeUser.id }),
    });
    if (!res.ok) throw new Error('Unable to get WebSocket ticket');
    return (await res.json()).ticket;
  }, []);

  const connectWebSocket = useCallback(async (): Promise<boolean> => {
    if (!userRef.current) return false;
    if (wsClient.isConnected()) {
      setConnectionStatus('connected');
      return true;
    }
    setConnectionStatus('connecting');
    try {
      const ticket = await getWsTicket();
      await wsClient.connect(ticket, {
        onOpen: () => setConnectionStatus('connected'),
        onClose: () => setConnectionStatus('disconnected'),
        getReconnectTicket: getWsTicket,
      });
      return true;
    } catch (e) {
      console.warn('WS Ticket fetch error:', e);
      setConnectionStatus('disconnected');
      return false;
    }
  }, [getWsTicket]);

  const handleServerFrame = useCallback((frame: WSFrame) => {
    const { type, payload } = frame;

    if (type === 'queue.matched') {
      sounds.playMatchFound();
      matchIdRef.current = payload.match_id;
      setMatchId(payload.match_id);
      setShareHash(payload.share_hash || payload.match_id);
      setOpponent(payload.opponent);
      setTotalRounds(payload.round_count || 7);
      setVibeScore(0);
      setMessages([]);
      setConnectState('none');
      setRematchState('none');
      setStage('game');
    } else if (type === 'round.start') {
      currentRoundRef.current = payload.round;
      setCurrentRound(payload.round);
      setQuestion(payload.question);
      setOpponentAnswered(false);
      setLastResult(null);
      setStage('game');
    } else if (type === 'opponent.answered') {
      setOpponentAnswered(true);
    } else if (type === 'round.result') {
      setLastResult(payload);
      setVibeScore(payload.vibe_score);
    } else if (type === 'match.complete') {
      setVibeScore(payload.vibe_score);
      setStage('postgame');
      if (payload.icebreaker) {
        setMessages([payload.icebreaker]);
      }
    } else if (type === 'message.receive') {
      setMessages((prev) => [...prev, payload]);
      if (payload.sender_id !== userRef.current?.id && payload.sender_id !== 'system') {
        sounds.playMessageReceived();
      }
    } else if (type === 'reaction.update') {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === payload.msg_id ? { ...msg, reactions: payload.reactions } : msg
        )
      );
    } else if (type === 'typing.update') {
      setOpponentTyping(payload.typing);
    } else if (type === 'connect.state') {
      setConnectState(payload.state);
      sounds.playNotification();
    } else if (type === 'rematch.state') {
      setRematchState(payload.state);
      sounds.playNotification();
    } else if (type === 'chat.closed') {
      setStage('landing');
    } else if (type === 'dm.receive') {
      setUnreadDMCount((prev) => prev + 1);
      sounds.playMessageReceived();
    } else if (type === 'friend.request' || type === 'friend.mutual') {
      sounds.playNotification();
      if (userRef.current) refreshUserProfile(userRef.current.id);
    } else if (type === 'duel.challenge') {
      sounds.playNotification();
      setIncomingChallenge({
        challengeId: payload.challenge_id,
        challenger: payload.challenger,
      });
    } else if (type === 'duel.declined') {
      sounds.playNotification();
      setChallengeNotice(`${payload.declined_by_alias || 'Friend'} declined the duel.`);
      setTimeout(() => setChallengeNotice(null), 4000);
    }
  }, []);

  // Subscribe once for the life of the app. A stable callback plus refs means
  // no event can be dropped while React tears down a round-dependent listener.
  useEffect(() => wsClient.subscribe(handleServerFrame), [handleServerFrame]);

  const handleChallengeFriend = async (friendId?: string, friendAlias?: string, isOnline?: boolean) => {
    if (!friendId) {
      handleFindMatch();
      return;
    }
    if (!user?.id) return;
    await connectWebSocket();

    if (wsClient.isConnected()) {
      wsClient.send('duel.challenge', { target_id: friendId });
    } else {
      try {
        await apiFetch(`/api/friends/challenge`, {
          method: 'POST',
          body: JSON.stringify({ challenger_id: user.id, target_id: friendId }),
        });
      } catch (e) {
        console.warn('Error posting duel challenge:', e);
      }
    }

    const msg = isOnline
      ? `⚔️ Duel invite sent to ${friendAlias || 'friend'}! Waiting for them to accept...`
      : `⚔️ ${friendAlias || 'Friend'} is offline. Duel challenge sent to their inbox!`;
    setChallengeNotice(msg);
    setTimeout(() => setChallengeNotice(null), 4500);
  };

  const handleRespondChallenge = async (action: 'accept' | 'decline') => {
    if (!incomingChallenge || !user?.id) return;
    const challengeId = incomingChallenge.challengeId;
    setIncomingChallenge(null);

    if (wsClient.isConnected()) {
      wsClient.send('duel.respond', { challenge_id: challengeId, action });
    } else {
      try {
        await apiFetch(`/api/friends/challenge/respond`, {
          method: 'POST',
          body: JSON.stringify({ challenge_id: challengeId, user_id: user.id, action }),
        });
      } catch (e) {
        console.warn('Error responding to duel challenge:', e);
      }
    }
  };

  const handleOpenDirectMessage = (
    friendId: string,
    friendAlias?: string,
    friendAvatar?: string,
    isOnline?: boolean
  ) => {
    setShowYouSpace(false);
    setPublicProfileTargetId(null);
    setActiveDMFriendId(friendId);
    setActiveDMFriend({
      id: friendId,
      alias: friendAlias,
      avatar_seed: friendAvatar,
      online: isOnline,
    });
    setShowDirectMessages(true);
  };

  const handleFindMatch = async () => {
    setStage('queue');
    const connected = await connectWebSocket();
    if (!connected) {
      setStage('landing');
      return;
    }
    wsClient.send('queue.join', { mode: 'quick' });
  };

  const handleCancelQueue = () => {
    wsClient.send('queue.leave', {});
    setStage('landing');
  };

  const handleSubmitAnswer = (choice: 'left' | 'right') => {
    const activeMatchId = matchIdRef.current;
    if (!activeMatchId) return;
    wsClient.send('round.answer', {
      match_id: activeMatchId,
      round: currentRoundRef.current,
      choice,
      idempotency_key: `ans_${Date.now()}`,
    });
  };

  const handleSendMessage = (body: string) => {
    sounds.playMessageSent();
    if (!matchId) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          room_id: 'mock_room',
          client_msg_id: `cmsg_${Date.now()}`,
          sender_id: user?.id || 'me',
          sender_alias: user?.alias || 'You',
          body,
          created_at: Math.floor(Date.now() / 1000),
        },
      ]);
      return;
    }
    wsClient.send('message.send', {
      match_id: matchId,
      body,
      client_msg_id: `msg_${Math.random().toString(36).substring(2, 10)}`,
    });
  };

  const handleReactMessage = (msgId: string, emoji: string) => {
    if (!matchId) return;
    wsClient.send('message.react', {
      match_id: matchId,
      msg_id: msgId,
      emoji,
    });
  };

  const handleTyping = (isTyping: boolean) => {
    if (!matchId) return;
    wsClient.send(isTyping ? 'typing.start' : 'typing.stop', { match_id: matchId });
  };

  const handleConnectRequest = () => {
    if (!matchId) return;
    // If guest, trigger soft upgrade prompt
    if (user?.is_guest) {
      setShowUpgradeModal(true);
      return;
    }
    wsClient.send('connect.request', { match_id: matchId });
  };

  const handleRematchRequest = () => {
    if (!matchId) return;
    wsClient.send('rematch.request', { match_id: matchId });
  };

  const handleLeaveMatch = () => {
    const activeMatchId = matchIdRef.current;
    if (activeMatchId) {
      wsClient.send('chat.leave', { match_id: activeMatchId });
    }
    setStage('landing');
    matchIdRef.current = null;
    setMatchId(null);
    setOpponent(null);
  };

  const handleBlockUser = async (targetId: string) => {
    if (!user?.id) return;
    try {
      await apiFetch(`/api/users/${user.id}/block?target_id=${targetId}`, {
        method: 'POST',
      });
      refreshUserProfile(user.id);
    } catch (e) {
      console.warn('Error blocking user:', e);
    }
  };

  const handleSendFriendRequestDirect = async (targetId: string) => {
    if (!user?.id) return;
    if (user.is_guest) {
      setShowUpgradeModal(true);
      return;
    }
    try {
      await apiFetch(`/api/friends/request`, {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id, target_user_id: targetId }),
      });
      refreshUserProfile(user.id);
    } catch (e) {
      console.warn('Error sending friend request:', e);
    }
  };

  if (is404) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-on-surface">
        <Navbar
          user={user}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onOpenYouSpace={() => {
            setYouSpaceTab('profile');
            setShowYouSpace(true);
          }}
          unreadCount={unreadDMCount}
          onFindMatch={handleFindMatch}
          onOpenLogin={() => setShowUpgradeModal(true)}
          onNavigateHome={navigateHome}
          onLogout={handleLogout}
        />
        <NotFoundScreen onGoHome={navigateHome} />
        {/* Exclusive to the 404 tree (early return) — only one CookieConsentBanner ever mounts. */}
        <CookieConsentBanner
          onOpenPrivacyPolicy={() => navigateTo('/privacy-policy')}
          forceOpen={showCookieSettings}
          onCloseSettings={() => setShowCookieSettings(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface relative selection:bg-primary/20">
      {/* Top Disconnect Alert Banner */}
      {connectionStatus === 'disconnected' && stage !== 'landing' && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <Banner
            type="warning"
            action={{
              label: 'Reconnect',
              onClick: connectWebSocket,
            }}
          >
            WebSocket connection interrupted. Attempting to restore live duel synchronization.
          </Banner>
        </div>
      )}

      {/* Global Fixed Navbar (Hidden on PostGame stage where dedicated chat header takes over) */}
      {stage !== 'postgame' && (
        <Navbar
          user={user}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onOpenYouSpace={() => {
            setYouSpaceTab('profile');
            setShowYouSpace(true);
          }}
          unreadCount={unreadDMCount}
          onFindMatch={handleFindMatch}
          onOpenLogin={() => setShowUpgradeModal(true)}
          onNavigateHome={navigateHome}
          onLogout={handleLogout}
        />
      )}

      {/* Stage Orchestrator */}
      <main className="flex-1 w-full flex flex-col">
        <div key={stage} className="flex-1 w-full flex flex-col animate-screen-enter">
          {stage === 'landing' && (
            <LandingScreen
              onFindMatch={handleFindMatch}
              onOpenPrivacyPolicy={() => navigateTo('/privacy-policy')}
              onOpenTerms={() => navigateTo('/terms')}
              onOpenCookieSettings={() => setShowCookieSettings(true)}
            />
          )}

          {stage === 'queue' && <QueueScreen onCancel={handleCancelQueue} />}
          
          {stage === 'game' && question && (
            <GameScreen
              key={`${matchId ?? 'match'}-${currentRound}-${question.id}`}
              currentRound={currentRound}
              totalRounds={totalRounds}
              question={question}
              opponent={opponent}
              onSubmitAnswer={handleSubmitAnswer}
              lastResult={lastResult}
              opponentAnswered={opponentAnswered}
              vibeScore={vibeScore}
            />
          )}

          {stage === 'postgame' && (
            <PostGameScreen
              vibeScore={vibeScore}
              totalRounds={totalRounds}
              shareHash={shareHash}
              opponent={opponent}
              currentUser={user}
              messages={messages}
              onSendMessage={handleSendMessage}
              onReactMessage={handleReactMessage}
              onTyping={handleTyping}
              opponentTyping={opponentTyping}
              onConnectRequest={handleConnectRequest}
              connectState={connectState}
              onRematchRequest={handleRematchRequest}
              rematchState={rematchState}
              onLeave={handleLeaveMatch}
              onOpenProfile={() => {
                if (opponent) setPublicProfileTargetId(opponent.id);
              }}
              onOpenReport={() => {
                if (opponent) {
                  setReportTarget({ id: opponent.id, alias: opponent.alias });
                  setShowReportModal(true);
                }
              }}
              onOpenShare={() => setShowShareModal(true)}
            />
          )}
        </div>
      </main>

      {/* ── You Personal Space Modal (Tabs: Profile, Friends, Requests, History, Stats) ── */}
      {showYouSpace && (
        <YouSpaceModal
          currentUser={user}
          initialTab={youSpaceTab}
          onClose={() => setShowYouSpace(false)}
          onUpdateUser={(updated) => setUser(updated)}
          onOpenUpgrade={() => setShowUpgradeModal(true)}
          onOpenPublicProfile={(userId) => setPublicProfileTargetId(userId)}
          onOpenDirectMessage={handleOpenDirectMessage}
          onChallengeFriend={handleChallengeFriend}
          onLogout={handleLogout}
        />
      )}

      {/* ── Public Profile Modal (With Mutual Synergy % computation) ── */}
      {publicProfileTargetId && (
        <PublicProfileModal
          targetUserId={publicProfileTargetId}
          currentUser={user}
          onClose={() => setPublicProfileTargetId(null)}
          onSendFriendRequest={handleSendFriendRequestDirect}
          onRematchInvite={(targetId) => handleChallengeFriend(targetId)}
          onBlockUser={handleBlockUser}
          onReportUser={(targetId, alias) => {
            setReportTarget({ id: targetId, alias });
            setShowReportModal(true);
          }}
          onOpenDirectMessage={handleOpenDirectMessage}
          onRequestUpgrade={() => setShowUpgradeModal(true)}
        />
      )}

      {/* ── Persistent Direct Messages Modal (1:1 DMs with Friends) ── */}
      {showDirectMessages && (
        <DirectMessageModal
          currentUser={user}
          initialFriend={activeDMFriend}
          initialFriendId={activeDMFriendId}
          onClose={() => {
            setShowDirectMessages(false);
            setActiveDMFriendId(null);
            setActiveDMFriend(null);
            if (user) refreshUserProfile(user.id);
          }}
          onOpenProfile={(userId) => setPublicProfileTargetId(userId)}
          onChallengeFriend={handleChallengeFriend}
        />
      )}

      {/* ── Account Upgrade & Login Modal ── */}
      {showUpgradeModal && (
        <AccountUpgradeModal
          currentUser={user}
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={(updatedUser) => {
            setUser(updatedUser);
            sessionStorage.removeItem('wyrmg_guest_user_id');
            localStorage.setItem('wouldyoumatch_user_id', updatedUser.id);
            localStorage.setItem('wyrmg_user_id', updatedUser.id);
            if (updatedUser.id) refreshUserProfile(updatedUser.id);
          }}
        />
      )}

      {/* ── Report Safety Modal ── */}
      {showReportModal && reportTarget && (
        <ReportModal
          opponentName={reportTarget.alias}
          onClose={() => {
            setShowReportModal(false);
            setReportTarget(null);
          }}
          onSubmit={async (reason) => {
            try {
              await apiFetch(`/api/reports`, {
                method: 'POST',
                body: JSON.stringify({
                  reporter_id: user?.id || 'usr_guest',
                  target_id: reportTarget.id,
                  room_id: matchId ? `room_${matchId}` : 'social_profile',
                  reason,
                }),
              });
            } catch (e) {
              console.warn('Report submit error:', e);
            }
            if (stage === 'postgame') {
              handleLeaveMatch();
            }
          }}
        />
      )}

      {/* ── Share Modal ── */}
      {showShareModal && opponent && (
        <ShareModal
          vibeScore={vibeScore}
          totalRounds={totalRounds}
          shareHash={shareHash}
          opponentAlias={opponent.alias}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* ── Incoming Duel Challenge Notification Banner ── */}
      {incomingChallenge && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-toast-slide">
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-primary/40 shadow-elevation-2 flex items-center justify-between gap-3.5 backdrop-blur-md ring-1 ring-primary/20">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                alias={incomingChallenge.challenger.alias}
                seed={incomingChallenge.challenger.avatar_seed}
                size="md"
                isGradient={true}
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
                    ⚔️ Duel Challenge
                  </span>
                </div>
                <span className="text-sm font-display font-bold text-on-surface truncate">
                  {incomingChallenge.challenger.alias} challenged you!
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleRespondChallenge('decline')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                Decline
              </button>
              <Button
                variant="primary-gradient"
                size="sm"
                onClick={() => handleRespondChallenge('accept')}
                className="rounded-lg text-xs px-3.5 py-1.5 font-bold shadow-sm"
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Global Challenge Toast Notice ── */}
      {challengeNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm animate-toast-slide pointer-events-none">
          <div className="p-3 rounded-xl bg-surface-container-lowest text-on-surface border border-glass-border shadow-elevation-2 text-center text-xs font-display font-bold">
            {challengeNotice}
          </div>
        </div>
      )}

      {/* ── Privacy Policy Modal ── */}
      {showPrivacyPolicy && (
        <PrivacyPolicyModal onClose={handleCloseLegal} />
      )}

      {/* ── Terms of Service Modal ── */}
      {showTerms && (
        <TermsOfServiceModal onClose={handleCloseLegal} />
      )}

      {/* ── Cookie & Storage Consent Banner ── */}
      <CookieConsentBanner
        onOpenPrivacyPolicy={() => navigateTo('/privacy-policy')}
        forceOpen={showCookieSettings}
        onCloseSettings={() => setShowCookieSettings(false)}
      />
    </div>
  );
};
