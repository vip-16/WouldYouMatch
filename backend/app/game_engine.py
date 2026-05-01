"""
WouldYouMatch? Game Engine & Social Data Manager
Handles room states, matchmaking queue, game state transitions, scoring,
and in-memory game history.
"""
import time
import uuid
import hashlib
from typing import Dict, List, Optional, Any, Set
from app.questions import get_round_questions
from app.db import (
    hash_password,
    verify_password,
    db_check_username_exists,
    db_check_email_exists,
    db_save_user,
    db_get_user_by_identifier,
    db_load_all_users,
    db_save_match_item,
    db_load_all_user_history,
    db_save_friendship,
    db_load_all_friendships,
    db_save_conversation,
    db_load_all_conversations,
    db_save_report,
    db_load_all_reports,
)


class PlayerState:
    def __init__(
        self,
        user_id: str,
        alias: str,
        avatar_seed: str,
        role: str = "user",
        username: Optional[str] = None,
        email: Optional[str] = None,
        is_guest: bool = True,
        shadowbanned: bool = False,
        websocket=None
    ):
        self.user_id = user_id
        self.alias = alias
        self.avatar_seed = avatar_seed
        self.role = role
        self.username = username
        self.email = email
        self.is_guest = is_guest
        self.shadowbanned = shadowbanned
        self.websocket = websocket
        self.connected = True
        self.last_active = time.time()
        self.created_at = time.time()
        self.blocked_users: Set[str] = set()


class MatchState:
    def __init__(self, match_id: str, player1: PlayerState, player2: PlayerState, round_count: int = 7):
        self.match_id = match_id
        self.share_hash = hashlib.sha256(f"share_{match_id}".encode()).hexdigest()[:12]
        self.room_id = f"room_{match_id}"
        self.players: Dict[str, PlayerState] = {
            player1.user_id: player1,
            player2.user_id: player2
        }
        self.round_count = round_count
        self.questions = get_round_questions(round_count, user_ids=[player1.user_id, player2.user_id])
        self.current_round_idx = 0
        self.status = "in_progress"
        self.answers: List[Dict[str, Any]] = []
        self.current_answers: Dict[str, str] = {}
        self.vibe_score = 0
        self.created_at = time.time()
        self.chat_messages: List[Dict[str, Any]] = []
        self.friend_requests: Dict[str, str] = {}
        self.friends: set = set()
        self.rematch_requests: set = set()
        self.blocks: set = set()

    def submit_answer(self, user_id: str, choice: str) -> bool:
        if self.status != "in_progress":
            return False
        if user_id not in self.players or choice not in ["left", "right"]:
            return False
        
        self.current_answers[user_id] = choice
        
        if len(self.current_answers) == 2:
            self._evaluate_round()
            return True
        return False

    def _evaluate_round(self):
        p_ids = list(self.players.keys())
        choice_a = self.current_answers.get(p_ids[0])
        choice_b = self.current_answers.get(p_ids[1])
        agreed = (choice_a == choice_b)
        if agreed:
            self.vibe_score += 1

        round_data = {
            "round": self.current_round_idx + 1,
            "question_id": self.questions[self.current_round_idx]["id"],
            "left": self.questions[self.current_round_idx]["left"],
            "right": self.questions[self.current_round_idx]["right"],
            "answers": dict(self.current_answers),
            "agreed": agreed,
            "timestamp": time.time()
        }
        self.answers.append(round_data)
        self.current_answers = {}
        
        self.current_round_idx += 1
        if self.current_round_idx >= self.round_count:
            self.status = "completed"
            self._inject_icebreaker_message()
            # Record match in global history
            engine.record_completed_match(self)

    def _inject_icebreaker_message(self):
        agreed_rounds = [r for r in self.answers if r["agreed"]]
        disagreed_rounds = [r for r in self.answers if not r["agreed"]]

        if agreed_rounds and disagreed_rounds:
            sample_agree = agreed_rounds[0]
            sample_disagree = disagreed_rounds[0]
            icebreaker_text = (
                f"⚡ You both agreed on Round {sample_agree['round']}! "
                f"However, you split on Round {sample_disagree['round']} "
                f"('{sample_disagree['left']}' vs '{sample_disagree['right']}'). "
                f"Ask them why they made that choice!"
            )
        elif agreed_rounds:
            icebreaker_text = f"🔥 Twin Flames! You agreed on {len(agreed_rounds)}/{self.round_count} choices. What made your vibes align so well?"
        else:
            icebreaker_text = f"💥 Total Opposites! You split on most choices. What was your most surprising disagreement?"

        system_msg = {
            "id": f"msg_sys_{uuid.uuid4().hex[:8]}",
            "room_id": self.room_id,
            "sender_id": "system",
            "sender_alias": "WouldYouMatch? Icebreaker",
            "body": icebreaker_text,
            "client_msg_id": "system_icebreaker",
            "created_at": time.time(),
            "read_by": list(self.players.keys()),
            "reactions": {}
        }
        self.chat_messages.append(system_msg)

    def add_message(self, sender_id: str, body: str, client_msg_id: str) -> Dict[str, Any]:
        msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        msg = {
            "id": msg_id,
            "room_id": self.room_id,
            "sender_id": sender_id,
            "sender_alias": self.players[sender_id].alias if sender_id in self.players else "Unknown",
            "body": body,
            "client_msg_id": client_msg_id,
            "created_at": time.time(),
            "read_by": [sender_id],
            "reactions": {}
        }
        self.chat_messages.append(msg)
        return msg

    def add_reaction(self, msg_id: str, emoji: str, user_id: str) -> Optional[Dict[str, Any]]:
        for msg in self.chat_messages:
            if msg["id"] == msg_id or msg["client_msg_id"] == msg_id:
                reactions = msg.setdefault("reactions", {})
                user_list = reactions.setdefault(emoji, [])
                if user_id in user_list:
                    user_list.remove(user_id)
                else:
                    user_list.append(user_id)
                return {"msg_id": msg["id"], "reactions": reactions}
        return None


class WouldYouMatchEngine:
    def __init__(self):
        self.users: Dict[str, PlayerState] = {}
        self.user_passwords: Dict[str, str] = {}
        self.queue: List[str] = []
        self.shadow_queue: List[str] = []
        self.matches: Dict[str, MatchState] = {}
        self.share_match_map: Dict[str, MatchState] = {}
        self.user_match_map: Dict[str, str] = {}
        self.user_tickets: Dict[str, str] = {}
        self.auth_tokens: Dict[str, str] = {}
        self.reports: List[Dict[str, Any]] = []
        
        # Social & History Data Stores
        self.user_match_history: Dict[str, List[Dict[str, Any]]] = {}
        # Friendships: key = sorted tuple (user1, user2) -> status ('pending_u1', 'pending_u2', 'mutual', 'blocked')
        self.friendships: Dict[str, Dict[str, Any]] = {}
        # Direct Message Conversations: id -> {id, participants: [u1, u2], messages: [...], unread: {u1: 0, u2: 0}, updated_at}
        self.conversations: Dict[str, Dict[str, Any]] = {}
        self.duel_challenges: Dict[str, Any] = {}

        # Product Funnel Analytics
        self.analytics_events = {
            "match_started": 0,
            "match_completed": 0,
            "match_voided": 0,
            "first_message_sent": 0,
            "keep_connected_mutual": 0,
            "accounts_upgraded": 0,
            "dm_sent": 0
        }

        # Load permanent database records into memory cache on startup
        self._load_from_database()

    def _load_from_database(self):
        try:
            # 1. Load users
            db_users = db_load_all_users()
            for u in db_users:
                uid = u["id"]
                player = PlayerState(
                    user_id=uid,
                    alias=u["alias"] or u["username"] or "Player",
                    avatar_seed=u["avatar_seed"] or f"seed_{uid[:6]}",
                    role=u["role"] or "registered",
                    username=u["username"],
                    email=u["email"],
                    is_guest=bool(u["is_guest"])
                )
                self.users[uid] = player
                if u["password_hash"]:
                    self.user_passwords[uid] = u["password_hash"]

            # 2. Load match histories
            self.user_match_history = db_load_all_user_history()

            # 3. Load friendships
            self.friendships = db_load_all_friendships()

            # 4. Load persistent DM conversations + reports
            try:
                self.conversations = db_load_all_conversations()
            except Exception:
                self.conversations = {}
            try:
                self.reports = db_load_all_reports()
            except Exception:
                self.reports = []
        except Exception as e:
            print(f"[WouldYouMatchEngine] Error loading database: {e}")

    # ── User Account Management ──
    def create_guest_user(self, device_fingerprint: str = "", role: str = "user") -> Dict[str, Any]:
        user_id = f"usr_{uuid.uuid4().hex[:10]}"
        alias_adjectives = ["Cosmic", "Neon", "Velvet", "Electric", "Solar", "Lunar", "Cyber", "Wild", "Mystic", "Starlight"]
        alias_nouns = ["Pickle", "Dragon", "Phoenix", "Panda", "Fox", "Vortex", "Wanderer", "Echo", "Falcon", "Otter"]
        import random
        alias = f"{random.choice(alias_adjectives)}{random.choice(alias_nouns)}{random.randint(10, 99)}"
        avatar_seed = f"seed_{user_id[:6]}"
        
        player = PlayerState(user_id=user_id, alias=alias, avatar_seed=avatar_seed, role=role, is_guest=True)
        self.users[user_id] = player
        self.user_match_history.setdefault(user_id, [])
        
        # Save guest in DB as well
        db_save_user(
            user_id=user_id,
            username=None,
            email=None,
            password_hash=None,
            alias=alias,
            avatar_seed=avatar_seed,
            role=role,
            is_guest=True
        )

        token = self.issue_token(user_id, kind="guest")
        return {
            "user_id": user_id,
            "alias": alias,
            "avatar_seed": avatar_seed,
            "role": role,
            "is_guest": True,
            "token": token
        }

    def upgrade_account(self, current_user_id: str, username: str, email: str, password: str) -> Dict[str, Any]:
        username = (username or "").strip()
        email = (email or "").strip()
        password = (password or "").strip()

        if not username:
            raise ValueError("Username cannot be empty")
        if len(username) < 3:
            raise ValueError("Username must be at least 3 characters")
        if not email or "@" not in email:
            raise ValueError("Please provide a valid email address")
        if not password or len(password) < 4:
            raise ValueError("Password must be at least 4 characters")

        # Support direct registration if user_id is empty or nonexistent
        if not current_user_id or current_user_id.strip() == "":
            current_user_id = f"usr_{uuid.uuid4().hex[:10]}"

        # Uniqueness check in SQLite (case-insensitive)
        if db_check_username_exists(username, exclude_uid=current_user_id):
            raise ValueError("Username is already taken. Please choose another.")
        
        if db_check_email_exists(email, exclude_uid=current_user_id):
            raise ValueError("Email is already registered. Please log in instead.")

        # Cryptographically secure salted PBKDF2 hash
        pw_hash = hash_password(password)

        player = self.users.get(current_user_id)
        if not player:
            avatar_seed = f"seed_{current_user_id[:6]}"
            player = PlayerState(
                user_id=current_user_id,
                alias=username,
                avatar_seed=avatar_seed,
                role="registered",
                username=username,
                email=email,
                is_guest=False
            )
            self.users[current_user_id] = player
            self.user_match_history.setdefault(current_user_id, [])
        else:
            player.username = username
            player.email = email
            player.alias = username
            player.is_guest = False
            player.role = "registered"

        self.user_passwords[current_user_id] = pw_hash
        self.analytics_events["accounts_upgraded"] += 1

        # Commit to permanent SQLite database
        db_save_user(
            user_id=current_user_id,
            username=username,
            email=email,
            password_hash=pw_hash,
            alias=player.alias,
            avatar_seed=player.avatar_seed,
            role=player.role,
            is_guest=False
        )

        token = self.issue_token(current_user_id, kind="account")
        return {
            "user_id": current_user_id,
            "username": username,
            "email": email,
            "alias": player.alias,
            "avatar_seed": player.avatar_seed,
            "role": player.role,
            "is_guest": False,
            "token": token
        }

    def login_user(self, login_identifier: str, password: str) -> Optional[Dict[str, Any]]:
        ident = (login_identifier or "").strip()
        if not ident or not password:
            return None

        # Check SQLite first (persistent source of truth)
        db_user = db_get_user_by_identifier(ident)
        target_uid = None
        stored_hash = None

        if db_user:
            target_uid = db_user["id"]
            stored_hash = db_user["password_hash"]
            # Ensure player is in memory
            if target_uid not in self.users:
                p = PlayerState(
                    user_id=target_uid,
                    alias=db_user["alias"] or db_user["username"] or "Player",
                    avatar_seed=db_user["avatar_seed"] or f"seed_{target_uid[:6]}",
                    role=db_user["role"] or "registered",
                    username=db_user["username"],
                    email=db_user["email"],
                    is_guest=bool(db_user["is_guest"])
                )
                self.users[target_uid] = p
            if stored_hash:
                self.user_passwords[target_uid] = stored_hash
        else:
            # Memory fallback
            for uid, p in self.users.items():
                if (p.username and p.username.lower() == ident.lower()) or (p.email and p.email.lower() == ident.lower()):
                    target_uid = uid
                    stored_hash = self.user_passwords.get(uid)
                    break

        if target_uid and stored_hash and verify_password(stored_hash, password):
            p = self.users[target_uid]
            token = self.issue_token(target_uid, kind="account")
            return {
                "user_id": target_uid,
                "username": p.username,
                "email": p.email,
                "alias": p.alias,
                "avatar_seed": p.avatar_seed,
                "role": p.role,
                "is_guest": False,
                "token": token
            }
        return None

    def update_profile(self, user_id: str, alias: Optional[str] = None, avatar_seed: Optional[str] = None) -> Dict[str, Any]:
        from app.security import sanitize_input
        p = self.users.get(user_id)
        if not p:
            raise ValueError("User not found")
        changed = False
        if alias is not None and str(alias).strip():
            clean_alias = sanitize_input(str(alias), max_length=25)
            if len(clean_alias) < 2:
                raise ValueError("Alias must be at least 2 characters")
            p.alias = clean_alias
            changed = True
        if avatar_seed:
            p.avatar_seed = sanitize_input(str(avatar_seed), max_length=120)
            changed = True
        if changed:
            # Persist update to SQLite
            db_save_user(
                user_id=p.user_id,
                username=p.username,
                email=p.email,
                password_hash=self.user_passwords.get(p.user_id),
                alias=p.alias,
                avatar_seed=p.avatar_seed,
                role=p.role,
                is_guest=p.is_guest
            )
        return {
            "id": p.user_id,
            "alias": p.alias,
            "avatar_seed": p.avatar_seed,
            "is_guest": p.is_guest,
            "username": p.username,
            "email": p.email
        }

    # ── Matchmaking & Ticket Management ──
    def generate_ws_ticket(self, user_id: str) -> str:
        ticket = f"tkt_{uuid.uuid4().hex}"
        self.user_tickets[ticket] = user_id
        return ticket

    def validate_ticket(self, ticket: str) -> Optional[str]:
        return self.user_tickets.pop(ticket, None)

    # ── Auth token verification (opaque jwt_guest_/jwt_account_ tokens) ──
    def issue_token(self, user_id: str, kind: str = "guest") -> str:
        prefix = "jwt_account" if kind == "account" else "jwt_guest"
        token = f"{prefix}_{user_id}_{uuid.uuid4().hex[:8]}"
        self.auth_tokens[token] = user_id
        return token

    def verify_token(self, token: Optional[str]) -> Optional[str]:
        if not token:
            return None
        t = token.strip()
        if t.lower().startswith("bearer "):
            t = t[7:].strip()
        # Exact registry hit (preferred)
        if t in self.auth_tokens:
            return self.auth_tokens[t]
        # Back-compat: legacy tokens shaped jwt_guest_{uid} / jwt_account_{uid}
        for legacy_prefix in ("jwt_account_", "jwt_guest_"):
            if t.startswith(legacy_prefix):
                uid = t[len(legacy_prefix):]
                # Legacy account tokens embed bare uid; guest tokens may too
                if uid in self.users:
                    self.auth_tokens[t] = uid
                    return uid
        return None

    def leave_match(self, user_id: str) -> Optional[str]:
        """Safely remove a user from their active match/queues. Never raises."""
        try:
            self.dequeue_player(user_id)
            match_id = self.user_match_map.pop(user_id, None)
            if match_id and match_id in self.matches:
                match = self.matches[match_id]
                # If match already completed, just detach; keep history
                if match.status == "completed":
                    return match_id
                # Mark remaining player mapping intact; void match if a player leaves mid-game
                others = [o for o in match.players.keys() if o != user_id]
                if not others:
                    self.matches.pop(match_id, None)
                else:
                    match.status = "voided"
                    try:
                        self.analytics_events["match_voided"] += 1
                    except Exception:
                        pass
                return match_id
            return match_id
        except Exception:
            return None

    def enqueue_player(self, user_id: str) -> Optional[MatchState]:
        p = self.users.get(user_id)
        if not p or not p.connected or p.websocket is None:
            print(f"[Matchmaking] Ignored queue join for disconnected user {user_id}")
            self.dequeue_player(user_id)
            return None

        target_queue = self.shadow_queue if (p and p.shadowbanned) else self.queue

        # Remove stale entries before trying to pair. A queue entry is useful
        # only while its WebSocket is still live.
        target_queue[:] = [
            queued_id
            for queued_id in target_queue
            if (queued := self.users.get(queued_id))
            and queued.connected
            and queued.websocket is not None
        ]

        if user_id not in target_queue:
            target_queue.append(user_id)
        
        # Matchmaking pairing (with block exclusion)
        if len(target_queue) >= 2:
            p1_id = target_queue[0]
            # Find first compatible opponent not blocked
            p2_id = None
            p1_player = self.users.get(p1_id)
            for cand_id in target_queue[1:]:
                p2_cand = self.users.get(cand_id)
                if p1_id != cand_id and p1_player and p2_cand:
                    # Check mutual block
                    if cand_id not in p1_player.blocked_users and p1_id not in p2_cand.blocked_users:
                        p2_id = cand_id
                        break

            if p2_id:
                target_queue.remove(p1_id)
                target_queue.remove(p2_id)
                
                p1 = self.users.get(p1_id)
                p2 = self.users.get(p2_id)
                
                if p1 and p2:
                    match_id = f"mch_{uuid.uuid4().hex[:10]}"
                    match = MatchState(match_id, p1, p2, round_count=7)
                    self.matches[match_id] = match
                    self.share_match_map[match.share_hash] = match
                    self.user_match_map[p1_id] = match_id
                    self.user_match_map[p2_id] = match_id
                    self.analytics_events["match_started"] += 1
                    return match
        return None

    def dequeue_player(self, user_id: str):
        if user_id in self.queue:
            self.queue.remove(user_id)
        if user_id in self.shadow_queue:
            self.shadow_queue.remove(user_id)

    # ── Match History & Stats ──
    def record_completed_match(self, match: MatchState):
        p_ids = list(match.players.keys())
        if len(p_ids) < 2:
            return

        pct = round((match.vibe_score / match.round_count) * 100)
        
        for uid in p_ids:
            opp_id = [o for o in p_ids if o != uid][0]
            opp = match.players[opp_id]
            record = {
                "match_id": match.match_id,
                "share_hash": match.share_hash,
                "vibe_score": match.vibe_score,
                "total_rounds": match.round_count,
                "synergy_pct": pct,
                "created_at": match.created_at,
                "opponent": {
                    "id": opp.user_id,
                    "alias": opp.alias,
                    "avatar_seed": opp.avatar_seed
                },
                "rounds": match.answers
            }
            if uid not in self.user_match_history:
                self.user_match_history[uid] = []
            self.user_match_history[uid].insert(0, record)
            # Persist duel match to SQLite
            try:
                db_save_match_item(uid, match.match_id, opp.user_id, record)
            except Exception as e:
                print(f"[WouldYouMatchEngine] Error saving match to db: {e}")


    def get_user_history(self, user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
        return self.user_match_history.get(user_id, [])[:limit]

    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        history = self.user_match_history.get(user_id, [])
        total_duels = len(history)
        if total_duels == 0:
            return {
                "total_duels": 0,
                "avg_synergy": 0,
                "best_synergy": 0,
                "current_streak": 0,
                "top_choices_count": 0,
                "total_dilemmas_answered": 0,
                "agreed_rounds_count": 0,
                "disagreed_rounds_count": 0,
                "high_vibe_duels_count": 0,
                "vibe_archetype": "Curious Explorer",
                "archetype_quote": "Ready to dive into the arena and discover your true vibe alignment."
            }
        
        scores = [h["synergy_pct"] for h in history]
        avg_synergy = round(sum(scores) / len(scores))
        best_synergy = max(scores)
        
        total_rounds = sum(h.get("total_rounds", 7) for h in history)
        agreed_rounds = sum(h.get("vibe_score", 0) for h in history)
        disagreed_rounds = max(0, total_rounds - agreed_rounds)
        high_vibe_duels = sum(1 for h in history if h.get("synergy_pct", 0) >= 57)
        
        # Calculate current high-vibe streak (synergy >= 55%)
        streak = 0
        for h in history:
            if h["synergy_pct"] >= 55:
                streak += 1
            else:
                break

        # Compute personality archetype
        if avg_synergy >= 75:
            archetype = "Twin Flame Magnet"
            quote = "Incredible intuitive empathy — you effortlessly align with players from all walks of life."
        elif avg_synergy >= 60:
            archetype = "Intuitive Harmonizer"
            quote = "Balanced and perceptive, you find shared ground on the most challenging hypothetical choices."
        elif avg_synergy >= 45:
            archetype = "Independent Pragmatist"
            quote = "You think for yourself with unapologetic clarity, creating exciting contrasts in every duel."
        else:
            archetype = "Bold Contrarian"
            quote = "Wild and unpredictable — you love the road less traveled and challenge convention."

        return {
            "total_duels": total_duels,
            "avg_synergy": avg_synergy,
            "best_synergy": best_synergy,
            "current_streak": streak,
            "top_choices_count": agreed_rounds,
            "total_dilemmas_answered": total_rounds,
            "agreed_rounds_count": agreed_rounds,
            "disagreed_rounds_count": disagreed_rounds,
            "high_vibe_duels_count": high_vibe_duels,
            "vibe_archetype": archetype,
            "archetype_quote": quote
        }

    # ── Mutual Synergy & Shared History ──
    def get_mutual_synergy(self, user_a: str, user_b: str) -> Dict[str, Any]:
        history_a = self.user_match_history.get(user_a, [])
        shared = [h for h in history_a if h["opponent"]["id"] == user_b]
        
        if not shared:
            return {
                "shared_matches_count": 0,
                "mutual_synergy_pct": None,
                "shared_history": []
            }
        
        total_score = sum(h["vibe_score"] for h in shared)
        total_rounds = sum(h["total_rounds"] for h in shared)
        pct = round((total_score / total_rounds) * 100) if total_rounds > 0 else 0

        return {
            "shared_matches_count": len(shared),
            "mutual_synergy_pct": pct,
            "shared_history": shared
        }

    # ── Friendships & Requests ──
    def _friendship_key(self, u1: str, u2: str) -> str:
        return f"{min(u1, u2)}_{max(u1, u2)}"

    def send_friend_request(self, from_user_id: str, to_user_id: str) -> Dict[str, Any]:
        if from_user_id == to_user_id:
            raise ValueError("Cannot friend yourself")
        
        # Block check
        to_player = self.users.get(to_user_id)
        if to_player and from_user_id in to_player.blocked_users:
            raise ValueError("Action not permitted")

        fkey = self._friendship_key(from_user_id, to_user_id)
        curr = self.friendships.get(fkey)

        if curr and curr.get("status") == "mutual":
            return {"status": "mutual"}
        
        if curr and curr.get("status") == f"pending_{to_user_id}":
            # Mutual acceptance!
            mutual_data = {
                "user_a": min(from_user_id, to_user_id),
                "user_b": max(from_user_id, to_user_id),
                "status": "mutual",
                "updated_at": time.time()
            }
            self.friendships[fkey] = mutual_data
            try:
                db_save_friendship(fkey, mutual_data["user_a"], mutual_data["user_b"], "mutual", mutual_data)
            except Exception as e:
                print(f"[WouldYouMatchEngine] Error saving friendship: {e}")
            # Auto-create persistent DM conversation
            self.get_or_create_conversation(from_user_id, to_user_id)
            self.analytics_events["keep_connected_mutual"] += 1
            return {"status": "mutual"}
        
        # Set pending from from_user_id
        pending_data = {
            "user_a": min(from_user_id, to_user_id),
            "user_b": max(from_user_id, to_user_id),
            "sender_id": from_user_id,
            "status": f"pending_{from_user_id}",
            "created_at": time.time()
        }
        self.friendships[fkey] = pending_data
        try:
            db_save_friendship(fkey, pending_data["user_a"], pending_data["user_b"], pending_data["status"], pending_data)
        except Exception as e:
            print(f"[WouldYouMatchEngine] Error saving friendship: {e}")
        return {"status": "requested"}

    def respond_friend_request(self, user_id: str, target_user_id: str, action: str) -> Dict[str, Any]:
        fkey = self._friendship_key(user_id, target_user_id)
        curr = self.friendships.get(fkey)
        
        if action == "accept":
            accepted_data = {
                "user_a": min(user_id, target_user_id),
                "user_b": max(user_id, target_user_id),
                "status": "mutual",
                "updated_at": time.time()
            }
            self.friendships[fkey] = accepted_data
            try:
                db_save_friendship(fkey, accepted_data["user_a"], accepted_data["user_b"], "mutual", accepted_data)
            except Exception as e:
                print(f"[WouldYouMatchEngine] Error saving friendship: {e}")
            self.get_or_create_conversation(user_id, target_user_id)
            return {"status": "mutual"}
        elif action == "ignore":
            self.friendships.pop(fkey, None)
            try:
                db_save_friendship(fkey, min(user_id, target_user_id), max(user_id, target_user_id), "ignored", {"status": "ignored"})
            except Exception as e:
                print(f"[WouldYouMatchEngine] Error updating friendship: {e}")
            return {"status": "ignored"}
        return {"status": "none"}

    def get_user_friends(self, user_id: str) -> List[Dict[str, Any]]:
        friends_list = []
        for fkey, f in self.friendships.items():
            if f.get("status") == "mutual" and (f["user_a"] == user_id or f["user_b"] == user_id):
                other_id = f["user_b"] if f["user_a"] == user_id else f["user_a"]
                other_user = self.users.get(other_id)
                if other_user:
                    synergy = self.get_mutual_synergy(user_id, other_id)
                    friends_list.append({
                        "id": other_user.user_id,
                        "alias": other_user.alias,
                        "avatar_seed": other_user.avatar_seed,
                        "online": other_user.connected,
                        "is_guest": other_user.is_guest,
                        "mutual_synergy_pct": synergy["mutual_synergy_pct"],
                        "shared_matches_count": synergy["shared_matches_count"]
                    })
        return friends_list

    def get_user_friend_requests(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        incoming = []
        outgoing = []
        for fkey, f in self.friendships.items():
            status = f.get("status", "")
            if status.startswith("pending_"):
                sender_id = f.get("sender_id")
                other_id = f["user_b"] if f["user_a"] == user_id else f["user_a"]
                if sender_id == user_id:
                    # Outgoing request
                    target = self.users.get(other_id)
                    if target:
                        outgoing.append({
                            "id": target.user_id,
                            "alias": target.alias,
                            "avatar_seed": target.avatar_seed,
                            "created_at": f.get("created_at")
                        })
                elif other_id == sender_id:
                    # Incoming request for user_id
                    sender = self.users.get(sender_id)
                    if sender:
                        incoming.append({
                            "id": sender.user_id,
                            "alias": sender.alias,
                            "avatar_seed": sender.avatar_seed,
                            "created_at": f.get("created_at")
                        })
        return {"incoming": incoming, "outgoing": outgoing}

    def block_user(self, user_id: str, target_id: str):
        p = self.users.get(user_id)
        if p:
            p.blocked_users.add(target_id)
        # Remove any friendship
        fkey = self._friendship_key(user_id, target_id)
        self.friendships.pop(fkey, None)

    # ── Persistent Direct Messages ──
    def _conversation_id(self, u1: str, u2: str) -> str:
        return f"dm_{min(u1, u2)}_{max(u1, u2)}"

    def get_or_create_conversation(self, u1: str, u2: str) -> Dict[str, Any]:
        cid = self._conversation_id(u1, u2)
        if cid not in self.conversations:
            self.conversations[cid] = {
                "id": cid,
                "participants": [u1, u2],
                "messages": [],
                "unread": {u1: 0, u2: 0},
                "updated_at": time.time()
            }
            try:
                db_save_conversation(self.conversations[cid])
            except Exception as e:
                print(f"[WouldYouMatchEngine] Error saving conversation: {e}")
        return self.conversations[cid]

    def _persist_conversation(self, cid: str):
        try:
            conv = self.conversations.get(cid)
            if conv:
                db_save_conversation(conv)
        except Exception as e:
            print(f"[WouldYouMatchEngine] Error persisting conversation: {e}")

    def add_direct_message(self, sender_id: str, recipient_id: str, body: str, client_msg_id: Optional[str] = None) -> Dict[str, Any]:
        # Block check
        rec_player = self.users.get(recipient_id)
        if rec_player and sender_id in rec_player.blocked_users:
            raise ValueError("Cannot message blocked user")

        conv = self.get_or_create_conversation(sender_id, recipient_id)
        
        # Deduplication check: if client_msg_id or identical recent message exists
        now = time.time()
        for m in conv["messages"][-5:]:
            if client_msg_id and m.get("client_msg_id") == client_msg_id:
                return m
            if m["sender_id"] == sender_id and m["body"] == body and (now - m["created_at"]) < 2.0:
                return m

        msg_id = f"dm_msg_{uuid.uuid4().hex[:12]}"
        sender_alias = self.users[sender_id].alias if sender_id in self.users else "Unknown"
        
        msg = {
            "id": msg_id,
            "client_msg_id": client_msg_id,
            "conversation_id": conv["id"],
            "sender_id": sender_id,
            "sender_alias": sender_alias,
            "body": body,
            "created_at": now,
            "reactions": {}
        }
        conv["messages"].append(msg)
        conv["unread"][recipient_id] = conv["unread"].get(recipient_id, 0) + 1
        conv["updated_at"] = now
        self.analytics_events["dm_sent"] += 1
        self._persist_conversation(conv["id"])
        return msg

    def get_user_conversations(self, user_id: str) -> List[Dict[str, Any]]:
        result = []
        for cid, conv in self.conversations.items():
            if user_id in conv["participants"]:
                other_ids = [p for p in conv["participants"] if p != user_id]
                other_id = other_ids[0] if other_ids else user_id
                other_user = self.users.get(other_id)
                last_msg = conv["messages"][-1] if conv["messages"] else None
                result.append({
                    "id": cid,
                    "friend": {
                        "id": other_id,
                        "alias": other_user.alias if other_user else "Friend",
                        "avatar_seed": other_user.avatar_seed if other_user else "",
                        "online": other_user.connected if other_user else False
                    },
                    "last_message": last_msg,
                    "unread_count": conv["unread"].get(user_id, 0),
                    "updated_at": conv["updated_at"]
                })
        result.sort(key=lambda c: c["updated_at"], reverse=True)
        return result

    def get_conversation_messages(self, conversation_id: str, user_id: str) -> List[Dict[str, Any]]:
        conv = self.conversations.get(conversation_id)
        if not conv or user_id not in conv["participants"]:
            return []
        # Mark as read for this user
        conv["unread"][user_id] = 0
        self._persist_conversation(conversation_id)
        return conv["messages"]

    def add_dm_reaction(self, conversation_id: str, msg_id: str, emoji: str, user_id: str) -> Optional[Dict[str, Any]]:
        conv = self.conversations.get(conversation_id)
        if not conv or user_id not in conv["participants"]:
            return None
        for m in conv["messages"]:
            if m["id"] == msg_id:
                reactions = m.setdefault("reactions", {})
                ulist = reactions.setdefault(emoji, [])
                if user_id in ulist:
                    ulist.remove(user_id)
                else:
                    ulist.append(user_id)
                self._persist_conversation(conversation_id)
                return {"msg_id": msg_id, "reactions": reactions}
        return None

    # ── Admin & Reports ──
    def toggle_shadowban(self, user_id: str) -> bool:
        if user_id in self.users:
            p = self.users[user_id]
            p.shadowbanned = not p.shadowbanned
            return p.shadowbanned
        return False

    def add_report(self, reporter_id: str, target_id: str, room_id: str, reason: str) -> Dict[str, Any]:
        match_id = room_id.replace("room_", "")
        msgs = []
        if match_id in self.matches:
            msgs = self.matches[match_id].chat_messages[-20:]

        report = {
            "id": f"rep_{uuid.uuid4().hex[:8]}",
            "reporter_id": reporter_id,
            "target_id": target_id,
            "target_alias": self.users[target_id].alias if target_id in self.users else "Unknown",
            "reason": reason,
            "room_id": room_id,
            "chat_log": msgs,
            "created_at": time.time()
        }
        self.reports.append(report)
        try:
            db_save_report(report)
        except Exception as e:
            print(f"[WouldYouMatchEngine] Error saving report: {e}")
        return report

    # ── Duel Challenge System ──
    def create_duel_challenge(self, challenger_id: str, target_id: str) -> Dict[str, Any]:
        if challenger_id == target_id:
            raise ValueError("Cannot challenge yourself")

        challenger = self.users.get(challenger_id)
        target = self.users.get(target_id)
        if not challenger or not target:
            raise ValueError("User not found")

        if challenger_id in target.blocked_users or target_id in challenger.blocked_users:
            raise ValueError("Cannot challenge this user")

        challenge_id = f"chl_{uuid.uuid4().hex[:10]}"
        challenge = {
            "challenge_id": challenge_id,
            "challenger_id": challenger_id,
            "challenger_alias": challenger.alias,
            "challenger_avatar_seed": challenger.avatar_seed,
            "target_id": target_id,
            "target_alias": target.alias,
            "status": "pending",
            "created_at": time.time()
        }
        self.duel_challenges[challenge_id] = challenge

        # Automatically record a notification message in the 1:1 conversation
        try:
            self.add_direct_message(
                challenger_id,
                target_id,
                f"⚔️ {challenger.alias} sent you a challenge to a live duel!"
            )
        except Exception as e:
            print("Error creating DM for challenge:", e)

        return {
            "challenge": challenge,
            "target_online": target.connected
        }

    def respond_duel_challenge(self, challenge_id: str, user_id: str, action: str) -> Dict[str, Any]:
        challenge = self.duel_challenges.get(challenge_id)
        if not challenge:
            raise ValueError("Challenge not found or expired")

        if challenge["target_id"] != user_id:
            raise ValueError("Unauthorized to respond to this challenge")

        if challenge["status"] != "pending":
            return {"status": challenge["status"]}

        if action == "accept":
            challenge["status"] = "accepted"
            challenger = self.users.get(challenge["challenger_id"])
            target = self.users.get(challenge["target_id"])

            if not challenger or not target:
                raise ValueError("A player is no longer available")

            # Create private direct match between the two friends
            match_id = f"mch_{uuid.uuid4().hex[:10]}"
            match = MatchState(match_id, challenger, target, round_count=7)
            self.matches[match_id] = match
            self.share_match_map[match.share_hash] = match
            self.user_match_map[challenger.user_id] = match_id
            self.user_match_map[target.user_id] = match_id
            self.analytics_events["match_started"] += 1

            return {
                "status": "accepted",
                "match": match,
                "challenger_id": challenger.user_id,
                "target_id": target.user_id
            }
        else:
            challenge["status"] = "declined"
            return {
                "status": "declined",
                "challenger_id": challenge["challenger_id"],
                "target_id": user_id
            }

engine = WouldYouMatchEngine()
