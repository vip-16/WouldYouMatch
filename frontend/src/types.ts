export interface User {
  id: string;
  alias: string;
  avatar_seed: string;
  username?: string;
  email?: string;
  is_guest?: boolean;
  role?: string;
  shadowbanned?: boolean;
  stats?: UserStats;
  friends_count?: number;
  incoming_requests_count?: number;
  total_unread_messages?: number;
}

export interface UserStats {
  total_duels: number;
  avg_synergy: number;
  best_synergy: number;
  current_streak: number;
  top_choices_count: number;
  total_dilemmas_answered?: number;
  agreed_rounds_count?: number;
  disagreed_rounds_count?: number;
  high_vibe_duels_count?: number;
  vibe_archetype?: string;
  archetype_quote?: string;
}

export interface Friend {
  id: string;
  alias: string;
  avatar_seed: string;
  online: boolean;
  is_guest?: boolean;
  mutual_synergy_pct: number | null;
  shared_matches_count: number;
}

export interface FriendRequestItem {
  id: string;
  alias: string;
  avatar_seed: string;
  created_at: number;
}

export interface FriendRequestsData {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
}

export interface MatchHistoryItem {
  match_id: string;
  share_hash: string;
  vibe_score: number;
  total_rounds: number;
  synergy_pct: number;
  created_at: number;
  opponent: {
    id: string;
    alias: string;
    avatar_seed: string;
  };
  rounds?: any[];
}

export interface PublicProfileData {
  id: string;
  alias: string;
  username?: string;
  avatar_seed: string;
  is_guest?: boolean;
  online: boolean;
  created_at: number;
  stats: {
    total_duels: number;
    avg_synergy: number;
  };
  mutual_synergy: {
    percentage: number | null;
    shared_duels_count: number;
    shared_history: MatchHistoryItem[];
  };
  friend_status: 'none' | 'requested' | 'pending' | 'mutual';
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_alias: string;
  body: string;
  created_at: number;
  reactions?: Record<string, string[]>;
  status?: 'sending' | 'sent' | 'failed';
}

export interface ConversationItem {
  id: string;
  friend: {
    id: string;
    alias: string;
    avatar_seed: string;
    online: boolean;
  };
  last_message: DirectMessage | null;
  unread_count: number;
  updated_at: number;
}

export interface Question {
  id: string;
  left: string;
  right: string;
}

export interface RoundResult {
  round: number;
  your_choice: 'left' | 'right';
  their_choice: 'left' | 'right';
  agreed: boolean;
  vibe_score: number;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_alias: string;
  body: string;
  client_msg_id: string;
  created_at: number;
  reactions?: Record<string, string[]>;
  status?: 'sending' | 'sent' | 'failed';
}

export interface DailyQuestion {
  id: string;
  left: string;
  right: string;
  // Null when no real community votes have been recorded yet.
  left_percent: number | null;
  right_percent: number | null;
  total_votes: number;
}

export type AppStage = 'landing' | 'queue' | 'game' | 'reveal' | 'postgame';

export interface WSFrame {
  type: string;
  seq: number;
  ts: number;
  payload: any;
}
