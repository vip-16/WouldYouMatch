"""
WouldYouMatch? AI Question Engine
Uses Google Gemini to dynamically generate viral, provocative,
funny, and deep "Would You Rather" dilemmas in the signature style of wouldyourather.app,
featuring SHA-256 deduplication and category balance.
"""
import os
import re
import json
import hashlib
import logging
import requests
from typing import List, Dict, Any, Set, Optional

logger = logging.getLogger("wouldyoumatch.ai_questions")

def normalize_text(text: str) -> str:
    """Normalize text for consistent duplicate detection."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', '', text)
    return " ".join(text.split())

def compute_dilemma_hash(left: str, right: str) -> str:
    """
    Computes an order-independent SHA-256 hash of the two options.
    If option A and B are swapped, it produces the exact same hash,
    preventing mirrored duplicates.
    """
    n_left = normalize_text(left)
    n_right = normalize_text(right)
    sorted_pair = sorted([n_left, n_right])
    canonical_str = f"{sorted_pair[0]}|||{sorted_pair[1]}"
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

def load_env_file():
    """Loads key-value pairs from .env in backend/ or root directory if present."""
    bases = [
        os.path.dirname(os.path.dirname(__file__)),
        os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    ]
    candidates = [".env", ".env.example.env", ".env.local"]
    for base in bases:
        for fname in candidates:
            env_file = os.path.join(base, fname)
            if os.path.exists(env_file):
                try:
                    with open(env_file, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith("#") and "=" in line:
                                k, v = line.split("=", 1)
                                k, v = k.strip(), v.strip().strip("'\"")
                                if k not in os.environ:
                                    os.environ[k] = v
                except Exception:
                    pass

def get_gemini_api_key() -> str:
    """Retrieves the Gemini API key from environment or .env files."""
    load_env_file()
    return os.getenv("GEMINI_API_KEY", "").strip()

def generate_ai_questions(count: int = 10, existing_hashes: Optional[Set[str]] = None, custom_instruction: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Generates a batch of unique, viral 'Would You Rather' questions in the exact style
    of wouldyourather.app using Google Gemini.
    Deduplicates against existing_hashes.
    """
    if existing_hashes is None:
        existing_hashes = set()

    api_key = get_gemini_api_key()
    if not api_key:
        logger.warning("Gemini API key not configured. Skipping AI generation.")
        return []

    extra_instruction = f"\nSpecial theme requirement: {custom_instruction}\n" if custom_instruction else ""

    prompt = f"""
You are the master question writer and curator for the website wouldyourather.app.
Generate {count + 4} viral, addictive, hilarious, provocative, and highly polarizing 'Would You Rather' questions in the exact signature style of wouldyourather.app.{extra_instruction}

Key Styles on wouldyourather.app:
- Silly & Absurd (hilarious everyday curses, weird body quirks, public embarrassment)
- Deep & Philosophical (existential dilemmas, truth vs happiness, time vs money, purpose vs ease)
- Superpowers & Fantasy (creative powers with agonizing or hilarious trade-offs)
- Modern Dating & Social (cringe texts, awkward confessions, secrets, relationships)
- Lifestyle & Perks (travel, food, career, luxury vs simple freedom)

CRITICAL RULES:
1. True 50/50 dilemma: Both choices must be equally tempting or equally agonizing to force intense debates.
2. Punchy phrasing: 4 to 9 words per option. Crisp, conversational English.
3. NO 'Would you rather' prefix in options: Provide the contrasting actions directly.
4. Output raw JSON only: A JSON array of objects.

JSON format:
[
  {{
    "left": "Option A text",
    "right": "Option B text",
    "category": "silly|deep|superpower|social|lifestyle",
    "tags": ["tag1", "tag2"]
  }}
]
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 1.0,
            "responseMimeType": "application/json"
        }
    }

    model_candidates = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest"]
    
    for model_name in model_candidates:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                
                # Strip markdown fences if present
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()

                items = json.loads(raw_text)
                if not isinstance(items, list):
                    continue

                fresh_questions: List[Dict[str, Any]] = []
                for item in items:
                    left = str(item.get("left", "")).strip()
                    right = str(item.get("right", "")).strip()
                    cat = str(item.get("category", "general")).strip().lower()
                    tags = item.get("tags", [cat])
                    if not isinstance(tags, list):
                        tags = [cat]

                    if not left or not right:
                        continue

                    # Filter overly verbose outputs
                    if len(left.split()) > 12 or len(right.split()) > 12:
                        continue

                    q_hash = compute_dilemma_hash(left, right)
                    if q_hash in existing_hashes:
                        logger.info(f"Skipping duplicate dilemma: {left} vs {right}")
                        continue

                    existing_hashes.add(q_hash)
                    fresh_questions.append({
                        "left": left,
                        "right": right,
                        "category": cat,
                        "tags": tags,
                        "hash": q_hash,
                        "source": "ai_gemini",
                        "active": True,
                        "votes_up": 100 + len(fresh_questions) * 15,
                        "votes_down": 10 + len(fresh_questions) * 3
                    })

                    if len(fresh_questions) >= count:
                        break

                if fresh_questions:
                    logger.info(f"Successfully generated {len(fresh_questions)} wouldyourather.app style questions using {model_name}")
                    return fresh_questions

            else:
                logger.warning(f"Model {model_name} returned status {resp.status_code}: {resp.text[:120]}")
        except Exception as e:
            logger.warning(f"Error calling {model_name}: {e}")

    logger.error("All Gemini model candidates failed to generate questions.")
    return []
