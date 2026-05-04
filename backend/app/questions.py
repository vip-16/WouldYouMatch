"""
WouldYouMatch? Question Repository
Contains AI-generated Would You Rather questions in the signature style of wouldyourather.app with:
- Persistent JSON database storage (backend/data/questions_db.json)
- Per-user play history tracking to eliminate repeated questions
- Dynamic AI replenishment via Google Gemini (REST API)
- Real-time voting and Daily Dilemma support
"""
import os
import json
import random
import logging
from typing import Dict, Any, List, Optional, Set
from app.ai_questions import compute_dilemma_hash, generate_ai_questions

logger = logging.getLogger("wouldyoumatch.questions")

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "questions_db.json")

# Default AI seed bank (generated via Google Gemini in the signature style of wouldyourather.app)
DEFAULT_QUESTIONS: List[Dict[str, Any]] = [
    {
        "id": "ai_wyr_0001",
        "left": "Bark like a dog every time you sneeze",
        "right": "Meow softly every time you finish a sentence",
        "category": "Absurd",
        "tags": ["silly", "animals", "funny"],
        "hash": "1b41714e634270018be4efec551ebdd542e91b101b1c4254b20bb5b0200eb8e5",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 180,
        "votes_down": 24
    },
    {
        "id": "ai_wyr_0002",
        "left": "Have a dramatic brass band follow your mistakes",
        "right": "Have a laugh track play during serious conversations",
        "category": "Absurd",
        "tags": ["awkward", "funny", "music"],
        "hash": "000ea3ce734bd43aee5f1ceaa8fabffeff380d591103e836adb5f678e6881bf3",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 210,
        "votes_down": 19
    },
    {
        "id": "ai_wyr_0003",
        "left": "Burp the national anthem whenever you meet someone",
        "right": "Fart loud trumpet sounds every time you sit",
        "category": "Embarrassing",
        "tags": ["gross", "awkward", "bodily functions"],
        "hash": "0b402caabfa6e7416950abfd55eb96bb0e1b4729b3935056dba4ab5173ac706b",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 140,
        "votes_down": 30
    },
    {
        "id": "ai_wyr_0004",
        "left": "Shout your thoughts out loud every ten minutes",
        "right": "Narrate your bathroom trips in a radio voice",
        "category": "Embarrassing",
        "tags": ["social", "awkward", "hilarious"],
        "hash": "b02f16f451adf3d7c57212ecc5f943023e0074a51f3618beeb85f5cce855a1be",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 290,
        "votes_down": 22
    },
    {
        "id": "ai_wyr_0005",
        "left": "Wear a soggy wet suit to every wedding",
        "right": "Wear a giant hotdog costume to job interviews",
        "category": "Silly",
        "tags": ["fashion", "awkward", "events"],
        "hash": "fb6f273020b8ee35f5043fe6f5b14def7bcd0390109d6d134a005aeca57c8440",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 250,
        "votes_down": 18
    },
    {
        "id": "ai_wyr_0013",
        "left": "Experience absolute truth at cost of sanity",
        "right": "Live a comforting lie with complete happiness",
        "category": "Philosophy",
        "tags": ["truth", "mind", "existential"],
        "hash": "442252fd3cccadaaa574b79a5d17de99763cb5de8fc2f4db43fa589eff9c3023",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 410,
        "votes_down": 35
    },
    {
        "id": "ai_wyr_0016",
        "left": "Relive your past knowing you cannot change anything",
        "right": "See your future knowing you cannot prevent it",
        "category": "Time",
        "tags": ["destiny", "time travel", "fate"],
        "hash": "394e1c86b3fc4ca5551f4bb205951e51c1a3b7aa60f5e35f67f077f117aa7cf9",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 365,
        "votes_down": 28
    },
    {
        "id": "ai_wyr_0021",
        "left": "Live forever alone as an immortal entity",
        "right": "Die tomorrow surrounded by everyone you love",
        "category": "Life & Death",
        "tags": ["immortality", "love", "mortality"],
        "hash": "097360184ba9bf1ced3a030fa6b0d2ca7e4234bfdaec2564f9ce22481d1b3244",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 490,
        "votes_down": 16
    },
    {
        "id": "ai_wyr_0025",
        "left": "Read minds, but only when people dislike you",
        "right": "See the future, but forget it immediately after",
        "category": "Superpowers",
        "tags": ["superpowers", "mind reading", "future"],
        "hash": "c8f6b95093dc7f50d2b4d7b39b10b40131b873d1ecd2fccea3e3b1e9b137c359",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 320,
        "votes_down": 25
    },
    {
        "id": "ai_wyr_0028",
        "left": "Instantly master any language you hear once",
        "right": "Instantly master any instrument you touch once",
        "category": "Superpowers",
        "tags": ["superpowers", "skills", "talent"],
        "hash": "246b4f1ae1b7f6e348d69afdeeda809e2850f7698594456bd94880a90dde07d5",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 512,
        "votes_down": 14
    },
    {
        "id": "ai_wyr_0029",
        "left": "Have unlimited free Uber rides for life",
        "right": "Have unlimited free First Class flights forever",
        "category": "Modern Lifestyle",
        "tags": ["lifestyle", "travel", "perks"],
        "hash": "19d5500d8c28755df220763d9f8dfc06f5e20af0c6b7f344db51d8baa130585a",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 640,
        "votes_down": 32,
        "daily_date": "2026-08-19"
    },
    {
        "id": "ai_wyr_0033",
        "left": "Date a 10 who hates your favorite hobbies",
        "right": "Date a 6 who loves everything you do",
        "category": "Dating",
        "tags": ["dating", "relationships", "looks"],
        "hash": "50e42dea90099239b4a495616a32692469789e49a23dd35727536a423c3324f0",
        "source": "ai_gemini",
        "active": True,
        "votes_up": 380,
        "votes_down": 45
    }
]

# Track seen questions per user: user_id -> Set of question_ids
USER_SEEN_HISTORY: Dict[str, Set[str]] = {}

def load_questions() -> List[Dict[str, Any]]:
    """Loads questions from persistent JSON file or initializes with AI defaults."""
    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception as e:
            logger.error(f"Failed to load questions from {DB_PATH}: {e}")
    
    # Initialize hashes for defaults
    for q in DEFAULT_QUESTIONS:
        if "hash" not in q:
            q["hash"] = compute_dilemma_hash(q["left"], q["right"])
    save_questions(DEFAULT_QUESTIONS)
    return list(DEFAULT_QUESTIONS)

def save_questions(questions: List[Dict[str, Any]]):
    """Saves the active questions list to disk."""
    try:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        with open(DB_PATH, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Failed to save questions to {DB_PATH}: {e}")

QUESTIONS: List[Dict[str, Any]] = load_questions()

def record_user_seen(user_id: str, question_ids: List[str]):
    """Records question IDs that a user has seen."""
    if not user_id:
        return
    if user_id not in USER_SEEN_HISTORY:
        USER_SEEN_HISTORY[user_id] = set()
    USER_SEEN_HISTORY[user_id].update(question_ids)

def replenish_question_bank(count: int = 15, custom_instruction: Optional[str] = None) -> int:
    """
    Calls Google Gemini AI engine to generate `count` new unique wouldyourather.app style dilemmas and appends to the database.
    Returns the number of new questions added.
    """
    global QUESTIONS
    existing_hashes = {q["hash"] for q in QUESTIONS if "hash" in q}
    
    new_questions = generate_ai_questions(count=count, existing_hashes=existing_hashes, custom_instruction=custom_instruction)
    if not new_questions:
        return 0

    next_idx = len(QUESTIONS) + 1
    for q in new_questions:
        q["id"] = f"ai_wyr_{next_idx:04d}"
        next_idx += 1
        QUESTIONS.append(q)

    save_questions(QUESTIONS)
    logger.info(f"Replenished question bank with {len(new_questions)} new AI questions. Total: {len(QUESTIONS)}")
    return len(new_questions)

def get_round_questions(count: int = 7, user_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Returns `count` questions for a match.
    Filters out questions that either player in `user_ids` has already seen!
    If unplayed question count is low, triggers auto-replenishment via AI.
    """
    global QUESTIONS
    active_pool = [q for q in QUESTIONS if q.get("active", True)]

    # Collect set of seen IDs
    seen_ids: Set[str] = set()
    if user_ids:
        for uid in user_ids:
            if uid in USER_SEEN_HISTORY:
                seen_ids.update(USER_SEEN_HISTORY[uid])

    # Unseen candidates
    unseen_pool = [q for q in active_pool if q["id"] not in seen_ids]

    # If pool of fresh questions is smaller than needed, try auto-replenishing via Google AI
    if len(unseen_pool) < count:
        try:
            added = replenish_question_bank(count=max(10, count))
            if added > 0:
                active_pool = [q for q in QUESTIONS if q.get("active", True)]
                unseen_pool = [q for q in active_pool if q["id"] not in seen_ids]
        except Exception as e:
            logger.warning(f"Auto-replenish failed: {e}")

    # Select candidates
    if len(unseen_pool) >= count:
        selected = random.sample(unseen_pool, count)
    else:
        selected = list(unseen_pool)
        remaining = [q for q in active_pool if q not in selected]
        needed = count - len(selected)
        if remaining:
            selected += random.sample(remaining, min(needed, len(remaining)))

    # Mark as seen for both users
    chosen_ids = [q["id"] for q in selected]
    if user_ids:
        for uid in user_ids:
            record_user_seen(uid, chosen_ids)

    return selected

def get_daily_question() -> Dict[str, Any]:
    """Retrieves the featured daily dilemma, rotating deterministically by date."""
    from datetime import date as _date
    today = _date.today().isoformat()
    daily = next((q for q in QUESTIONS if q.get("daily_date") == today), None)
    if not daily:
        pool = [q for q in QUESTIONS if q.get("active", True)] or QUESTIONS
        if not pool:
            raise ValueError("Question bank is empty")
        idx = _date.today().toordinal() % len(pool)
        daily = pool[idx]
    
    votes_up = daily.get("votes_up", 120)
    votes_down = daily.get("votes_down", 80)
    total = votes_up + votes_down
    left_pct = int(round((votes_up / total) * 100)) if total > 0 else 50
    right_pct = 100 - left_pct

    return {
        "id": daily["id"],
        "left": daily["left"],
        "right": daily["right"],
        "category": daily.get("category", "General"),
        "left_percent": left_pct,
        "right_percent": right_pct,
        "total_votes": total
    }

def vote_question(question_id: str, vote_type: str) -> Optional[Dict[str, Any]]:
    q = next((q for q in QUESTIONS if q["id"] == question_id), None)
    if q:
        if vote_type == "up":
            q["votes_up"] = q.get("votes_up", 0) + 1
        elif vote_type == "down":
            q["votes_down"] = q.get("votes_down", 0) + 1
        save_questions(QUESTIONS)
        return q
    return None
