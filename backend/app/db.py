"""
WouldYouMatch? SQLite Persistence & Cryptographic Auth Database
Stores permanent user accounts, salted PBKDF2 password hashes,
match history records, and social friendship graphs in backend/data/wouldyoumatch.db.
"""
import sqlite3
import os
import hashlib
import hmac
import json
import time
import shutil
from typing import Optional, Dict, Any, List, Tuple

# Locate database file inside backend/data/ or custom DATABASE_PATH
DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.getenv("DATABASE_PATH", os.path.join(DB_DIR, "wouldyoumatch.db"))
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
OLD_DB = os.path.join(DB_DIR, "wyrmg.db")
if os.path.exists(OLD_DB) and not os.path.exists(DB_PATH):
    try:
        shutil.copy2(OLD_DB, DB_PATH)
    except Exception:
        pass

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    """Initializes the database schema if tables do not exist."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE COLLATE NOCASE,
                email TEXT UNIQUE COLLATE NOCASE,
                password_hash TEXT,
                alias TEXT NOT NULL,
                avatar_seed TEXT NOT NULL,
                role TEXT DEFAULT 'registered',
                is_guest INTEGER DEFAULT 0,
                created_at REAL,
                updated_at REAL
            );
        """)
        
        # Index on username and email for case-insensitive lookup
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email COLLATE NOCASE);")

        # 2. Match History Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS match_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                match_id TEXT NOT NULL,
                opponent_id TEXT,
                data_json TEXT NOT NULL,
                timestamp REAL NOT NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_user ON match_history(user_id);")

        # 3. Friendships Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS friendships (
                fkey TEXT PRIMARY KEY,
                user_1 TEXT NOT NULL,
                user_2 TEXT NOT NULL,
                status TEXT NOT NULL,
                data_json TEXT NOT NULL,
                updated_at REAL NOT NULL
            );
        """)

        # 4. DM Conversations Table (persistent 1:1 messaging)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                participants_json TEXT NOT NULL,
                messages_json TEXT NOT NULL,
                unread_json TEXT NOT NULL,
                updated_at REAL NOT NULL
            );
        """)

        # 5. Moderation Reports Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                reporter_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                room_id TEXT NOT NULL,
                reason TEXT NOT NULL,
                chat_log_json TEXT NOT NULL,
                created_at REAL NOT NULL
            );
        """)

        conn.commit()

# Initialize tables immediately on module import
init_db()

# ── Password Security Helpers (PBKDF2-HMAC-SHA256) ──

def hash_password(password: str) -> str:
    """
    Generates a cryptographically secure salted PBKDF2 hash.
    Format: pbkdf2:sha256:100000$<salt_hex>$<key_hex>
    """
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 100000)
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"

def verify_password(stored_hash: Optional[str], provided_password: str) -> bool:
    """
    Verifies a plain password against the stored salted PBKDF2 hash.
    Uses constant-time comparison to prevent timing attacks.
    """
    if not stored_hash or not isinstance(stored_hash, str):
        return False
    try:
        parts = stored_hash.split("$")
        if len(parts) != 3:
            # Fallback for plain text transition if any existed
            return hmac.compare_digest(stored_hash, provided_password)
        algorithm_meta, salt_hex, key_hex = parts
        _, _, iterations = algorithm_meta.split(":")
        new_key = hashlib.pbkdf2_hmac(
            "sha256",
            provided_password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iterations)
        )
        return hmac.compare_digest(new_key.hex(), key_hex)
    except Exception:
        return False

# ── User DB Operations ──

def db_check_username_exists(username: str, exclude_uid: Optional[str] = None) -> bool:
    """Checks whether a username is already taken (case-insensitive)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        if exclude_uid:
            cursor.execute(
                "SELECT 1 FROM users WHERE username = ? COLLATE NOCASE AND id != ? LIMIT 1;",
                (username.strip(), exclude_uid)
            )
        else:
            cursor.execute(
                "SELECT 1 FROM users WHERE username = ? COLLATE NOCASE LIMIT 1;",
                (username.strip(),)
            )
        return cursor.fetchone() is not None

def db_check_email_exists(email: str, exclude_uid: Optional[str] = None) -> bool:
    """Checks whether an email is already registered (case-insensitive)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        if exclude_uid:
            cursor.execute(
                "SELECT 1 FROM users WHERE email = ? COLLATE NOCASE AND id != ? LIMIT 1;",
                (email.strip(), exclude_uid)
            )
        else:
            cursor.execute(
                "SELECT 1 FROM users WHERE email = ? COLLATE NOCASE LIMIT 1;",
                (email.strip(),)
            )
        return cursor.fetchone() is not None

def db_save_user(
    user_id: str,
    username: Optional[str],
    email: Optional[str],
    password_hash: Optional[str],
    alias: str,
    avatar_seed: str,
    role: str = "registered",
    is_guest: bool = False
):
    """Inserts or updates a user in the database."""
    now = time.time()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (id, username, email, password_hash, alias, avatar_seed, role, is_guest, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                username = excluded.username,
                email = excluded.email,
                password_hash = COALESCE(excluded.password_hash, users.password_hash),
                alias = excluded.alias,
                avatar_seed = excluded.avatar_seed,
                role = excluded.role,
                is_guest = excluded.is_guest,
                updated_at = excluded.updated_at;
        """, (
            user_id,
            username.strip() if username else None,
            email.strip() if email else None,
            password_hash,
            alias.strip(),
            avatar_seed,
            role,
            1 if is_guest else 0,
            now,
            now
        ))
        conn.commit()

def db_get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetches user record by ID."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def db_get_user_by_identifier(identifier: str) -> Optional[Dict[str, Any]]:
    """Looks up user by username or email (case-insensitive)."""
    ident = identifier.strip()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE LIMIT 1;",
            (ident, ident)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

def db_load_all_users() -> List[Dict[str, Any]]:
    """Loads all stored users on system startup."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users;")
        return [dict(r) for r in cursor.fetchall()]

# ── Match History DB Operations ──

def db_save_match_item(user_id: str, match_id: str, opponent_id: str, data: Dict[str, Any]):
    """Stores a single completed match history record."""
    now = time.time()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO match_history (user_id, match_id, opponent_id, data_json, timestamp)
            VALUES (?, ?, ?, ?, ?);
        """, (user_id, match_id, opponent_id, json.dumps(data), now))
        conn.commit()

def db_load_all_user_history() -> Dict[str, List[Dict[str, Any]]]:
    """Loads all user match histories grouped by user_id (newest first)."""
    history_map: Dict[str, List[Dict[str, Any]]] = {}
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, data_json FROM match_history ORDER BY id DESC;")
        for row in cursor.fetchall():
            uid = row["user_id"]
            try:
                item = json.loads(row["data_json"])
                history_map.setdefault(uid, []).append(item)
            except Exception:
                continue
    return history_map


def db_save_conversation(conv: Dict[str, Any]):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO conversations (id, participants_json, messages_json, unread_json, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                participants_json = excluded.participants_json,
                messages_json = excluded.messages_json,
                unread_json = excluded.unread_json,
                updated_at = excluded.updated_at;
        """, (
            conv["id"],
            json.dumps(conv.get("participants", [])),
            json.dumps(conv.get("messages", [])),
            json.dumps(conv.get("unread", {})),
            conv.get("updated_at", time.time()),
        ))
        conn.commit()


def db_load_all_conversations() -> Dict[str, Dict[str, Any]]:
    convs: Dict[str, Dict[str, Any]] = {}
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, participants_json, messages_json, unread_json, updated_at FROM conversations;")
        for row in cursor.fetchall():
            try:
                convs[row["id"]] = {
                    "id": row["id"],
                    "participants": json.loads(row["participants_json"] or "[]"),
                    "messages": json.loads(row["messages_json"] or "[]"),
                    "unread": json.loads(row["unread_json"] or "{}"),
                    "updated_at": row["updated_at"],
                }
            except Exception:
                continue
    return convs


def db_save_report(report: Dict[str, Any]):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO reports (id, reporter_id, target_id, room_id, reason, chat_log_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            report["id"],
            report.get("reporter_id", ""),
            report.get("target_id", ""),
            report.get("room_id", ""),
            report.get("reason", ""),
            json.dumps(report.get("chat_log", [])),
            report.get("created_at", time.time()),
        ))
        conn.commit()


def db_load_all_reports() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, reporter_id, target_id, room_id, reason, chat_log_json, created_at FROM reports ORDER BY created_at DESC;")
        out = []
        for row in cursor.fetchall():
            try:
                out.append({
                    "id": row["id"],
                    "reporter_id": row["reporter_id"],
                    "target_id": row["target_id"],
                    "room_id": row["room_id"],
                    "reason": row["reason"],
                    "chat_log": json.loads(row["chat_log_json"] or "[]"),
                    "created_at": row["created_at"],
                })
            except Exception:
                continue
        return out

# ── Friendships DB Operations ──

def db_save_friendship(fkey: str, user_1: str, user_2: str, status: str, data: Dict[str, Any]):
    """Saves or updates a friendship record."""
    now = time.time()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO friendships (fkey, user_1, user_2, status, data_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(fkey) DO UPDATE SET
                status = excluded.status,
                data_json = excluded.data_json,
                updated_at = excluded.updated_at;
        """, (fkey, user_1, user_2, status, json.dumps(data), now))
        conn.commit()

def db_load_all_friendships() -> Dict[str, Dict[str, Any]]:
    """Loads all friendships from the database."""
    friendships: Dict[str, Dict[str, Any]] = {}
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT fkey, data_json FROM friendships;")
        for row in cursor.fetchall():
            try:
                friendships[row["fkey"]] = json.loads(row["data_json"])
            except Exception:
                continue
    return friendships
