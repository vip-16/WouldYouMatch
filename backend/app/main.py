"""
WouldYouMatch? FastAPI Application Entrypoint
Exposes:
- Dual Guest & Upgraded Account Auth endpoints
- "You" space Profile, Friends, Requests, History, and Stats endpoints
- Public User Profile & Mutual Synergy computation
- Persistent 1:1 Direct Messages & Conversations
- Real-time WebSocket Gateway & Ticketing
- Daily dilemma question & Question voting
- Gated Admin & Ops Moderation
- Public Share Cards with OG tags
"""
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Header, Query, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.game_engine import engine
from app.questions import get_daily_question, QUESTIONS
from app.websocket_manager import ws_manager, handle_websocket_message, launch_match
from app.security import (
    rate_limiter,
    SecurityHeadersMiddleware,
    HTTPSRedirectMiddleware,
    sanitize_input,
    is_valid_email
)

app = FastAPI(title="WouldYouMatch? API", version="2.0.0")

# Security Headers & HTTPS Enforcement
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(HTTPSRedirectMiddleware)

# Configurable CORS Origins
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://wouldyoumatch.app",
        "https://www.wouldyoumatch.app"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Request Schemas ──
class GuestAuthRequest(BaseModel):
    device_fingerprint: Optional[str] = ""

class UpgradeAccountRequest(BaseModel):
    user_id: Optional[str] = ""
    username: str
    email: str
    password: str
    honeypot: Optional[str] = ""

class LoginRequest(BaseModel):
    identifier: str  # username or email
    password: str

class UpdateProfileRequest(BaseModel):
    user_id: str
    alias: Optional[str] = None
    avatar_seed: Optional[str] = None

class TicketRequest(BaseModel):
    user_id: str

class FriendActionRequest(BaseModel):
    user_id: str
    target_user_id: str
    action: Optional[str] = "accept"  # "accept" or "ignore"

class DuelChallengeRequest(BaseModel):
    challenger_id: str
    target_id: str

class DuelChallengeRespondRequest(BaseModel):
    challenge_id: str
    user_id: str
    action: Optional[str] = "accept"

class DirectMessageSendRequest(BaseModel):
    sender_id: str
    recipient_id: str
    body: str
    client_msg_id: Optional[str] = None

class ReportRequest(BaseModel):
    reporter_id: Optional[str] = "usr_guest"
    target_id: str
    room_id: str
    reason: str
    honeypot: Optional[str] = ""

class DailyAnswerRequest(BaseModel):
    question_id: str
    choice: str

# ── Health Check ──
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "users_online": len(ws_manager.active_connections),
        "total_registered_users": len(engine.users),
        "active_matches": len(engine.matches),
        "queue_depth": len(engine.queue),
        "shadow_queue_depth": len(engine.shadow_queue)
    }

# ── Authentication & Account Management ──
@app.post("/api/auth/guest")
def create_guest(req: GuestAuthRequest):
    user_data = engine.create_guest_user(req.device_fingerprint or "")
    return {
        "access_token": user_data["token"],
        "user": {
            "id": user_data["user_id"],
            "alias": user_data["alias"],
            "avatar_seed": user_data["avatar_seed"],
            "role": user_data["role"],
            "is_guest": True
        }
    }

@app.post("/api/auth/upgrade")
def upgrade_account(req: UpgradeAccountRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if rate_limiter.is_rate_limited(client_ip, "auth_upgrade", max_requests=6, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many upgrade requests. Please try again in 1 minute.")
    
    if req.honeypot:
        raise HTTPException(status_code=400, detail="Invalid request")

    if not is_valid_email(req.email):
        raise HTTPException(status_code=400, detail="Please provide a valid email address")

    clean_username = sanitize_input(req.username, max_length=25)
    if len(clean_username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")

    try:
        user_data = engine.upgrade_account(req.user_id, clean_username, req.email.strip().lower(), req.password)
        return {
            "access_token": user_data["token"],
            "user": {
                "id": user_data["user_id"],
                "username": user_data["username"],
                "email": user_data["email"],
                "alias": user_data["alias"],
                "avatar_seed": user_data["avatar_seed"],
                "role": user_data["role"],
                "is_guest": False
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
def login_user(req: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if rate_limiter.is_rate_limited(client_ip, "auth_login", max_requests=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please wait 1 minute.")

    clean_id = sanitize_input(req.identifier, max_length=100)
    user_data = engine.login_user(clean_id, req.password)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid username/email or password")
    return {
        "access_token": user_data["token"],
        "user": {
            "id": user_data["user_id"],
            "username": user_data["username"],
            "email": user_data["email"],
            "alias": user_data["alias"],
            "avatar_seed": user_data["avatar_seed"],
            "role": user_data["role"],
            "is_guest": False
        }
    }

@app.get("/api/me")
def get_current_user_profile(user_id: str = Query(...)):
    p = engine.users.get(user_id)
    if not p:
        # Auto-create if not found
        data = engine.create_guest_user()
        p = engine.users[data["user_id"]]
        user_id = data["user_id"]

    stats = engine.get_user_stats(user_id)
    friends = engine.get_user_friends(user_id)
    requests = engine.get_user_friend_requests(user_id)
    conversations = engine.get_user_conversations(user_id)
    total_unread = sum(c["unread_count"] for c in conversations)

    return {
        "id": p.user_id,
        "alias": p.alias,
        "username": p.username,
        "email": p.email,
        "avatar_seed": p.avatar_seed,
        "is_guest": p.is_guest,
        "role": p.role,
        "stats": stats,
        "friends_count": len(friends),
        "incoming_requests_count": len(requests["incoming"]),
        "total_unread_messages": total_unread
    }

@app.patch("/api/me/profile")
def update_profile(req: UpdateProfileRequest):
    try:
        res = engine.update_profile(req.user_id, req.alias, req.avatar_seed)
        return {"status": "ok", "user": res}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# ── "You" Space: History & Stats ──
@app.get("/api/me/history")
def get_user_history(user_id: str = Query(...), limit: int = 30):
    history = engine.get_user_history(user_id, limit=limit)
    return {"history": history}

@app.get("/api/me/stats")
def get_user_stats(user_id: str = Query(...)):
    stats = engine.get_user_stats(user_id)
    return {"stats": stats}

# ── "You" Space: Friends & Requests ──
@app.get("/api/friends")
def get_friends(user_id: str = Query(...)):
    friends = engine.get_user_friends(user_id)
    return {"friends": friends}

@app.get("/api/friends/requests")
def get_friend_requests(user_id: str = Query(...)):
    reqs = engine.get_user_friend_requests(user_id)
    return reqs

@app.post("/api/friends/request")
async def send_friend_request(req: FriendActionRequest):
    try:
        res = engine.send_friend_request(req.user_id, req.target_user_id)
        # Notify recipient via WebSocket if online
        if res.get("status") == "mutual":
            await ws_manager.send_event(req.target_user_id, "friend.mutual", {"friend_id": req.user_id})
        else:
            await ws_manager.send_event(req.target_user_id, "friend.request", {"from_id": req.user_id})
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/friends/respond")
async def respond_friend_request(req: FriendActionRequest):
    res = engine.respond_friend_request(req.user_id, req.target_user_id, req.action or "accept")
    if res.get("status") == "mutual":
        await ws_manager.send_event(req.target_user_id, "friend.mutual", {"friend_id": req.user_id})
    return res

@app.post("/api/friends/challenge")
async def send_duel_challenge(req: DuelChallengeRequest):
    try:
        res = engine.create_duel_challenge(req.challenger_id, req.target_id)
        ch = res["challenge"]
        if res["target_online"]:
            await ws_manager.send_event(req.target_id, "duel.challenge", {
                "challenge_id": ch["challenge_id"],
                "challenger": {
                    "id": ch["challenger_id"],
                    "alias": ch["challenger_alias"],
                    "avatar_seed": ch["challenger_avatar_seed"]
                },
                "timestamp": ch["created_at"]
            })
        return {"status": "sent", "challenge": ch, "target_online": res["target_online"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/friends/challenge/respond")
async def respond_duel_challenge_api(req: DuelChallengeRespondRequest):
    try:
        res = engine.respond_duel_challenge(req.challenge_id, req.user_id, req.action or "accept")
        if res.get("status") == "accepted":
            match = res["match"]
            await launch_match(match)
            return {"status": "accepted", "match_id": match.match_id}
        elif res.get("status") == "declined":
            challenger_id = res["challenger_id"]
            await ws_manager.send_event(challenger_id, "duel.declined", {
                "challenge_id": req.challenge_id,
                "declined_by": req.user_id
            })
            return {"status": "declined"}
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/users/{user_id}/block")
def block_user(user_id: str, target_id: str = Query(...)):
    engine.block_user(user_id, target_id)
    return {"status": "blocked", "target_id": target_id}

# ── Public Profile & Mutual Synergy ──
@app.get("/api/users/{target_id}")
def get_public_profile(target_id: str, viewer_id: Optional[str] = Query(None)):
    target = engine.users.get(target_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if viewer is blocked
    if viewer_id and viewer_id in target.blocked_users:
        raise HTTPException(status_code=403, detail="User profile unavailable")

    mutual = engine.get_mutual_synergy(viewer_id or "", target_id) if viewer_id else {"shared_matches_count": 0, "mutual_synergy_pct": None, "shared_history": []}
    target_stats = engine.get_user_stats(target_id)

    # Check friendship status with viewer
    friend_status = "none"
    if viewer_id:
        fkey = engine._friendship_key(viewer_id, target_id)
        f = engine.friendships.get(fkey)
        if f:
            if f.get("status") == "mutual":
                friend_status = "mutual"
            elif f.get("status") == f"pending_{viewer_id}":
                friend_status = "requested"
            else:
                friend_status = "pending"

    return {
        "id": target.user_id,
        "alias": target.alias,
        "username": target.username,
        "avatar_seed": target.avatar_seed,
        "is_guest": target.is_guest,
        "online": target.connected,
        "created_at": target.created_at,
        "stats": {
            "total_duels": target_stats["total_duels"],
            "avg_synergy": target_stats["avg_synergy"]
        },
        "mutual_synergy": {
            "percentage": mutual["mutual_synergy_pct"],
            "shared_duels_count": mutual["shared_matches_count"],
            "shared_history": mutual["shared_history"][:5]
        },
        "friend_status": friend_status
    }

# ── Persistent Direct Messaging (DMs) ──
@app.get("/api/conversations")
def get_conversations(user_id: str = Query(...)):
    convs = engine.get_user_conversations(user_id)
    return {"conversations": convs}

@app.get("/api/conversations/with_friend")
def get_or_create_conversation_with_friend(user_id: str = Query(...), friend_id: str = Query(...)):
    conv = engine.get_or_create_conversation(user_id, friend_id)
    other_user = engine.users.get(friend_id)
    last_msg = conv["messages"][-1] if conv["messages"] else None
    return {
        "conversation": {
            "id": conv["id"],
            "friend": {
                "id": friend_id,
                "alias": other_user.alias if other_user else "Unknown",
                "avatar_seed": other_user.avatar_seed if other_user else "",
                "online": other_user.connected if other_user else False
            },
            "last_message": last_msg,
            "unread_count": conv["unread"].get(user_id, 0),
            "updated_at": conv["updated_at"]
        }
    }

@app.get("/api/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: str, user_id: str = Query(...)):
    msgs = engine.get_conversation_messages(conversation_id, user_id)
    return {"messages": msgs}

@app.post("/api/conversations/messages")
async def send_direct_message(req: DirectMessageSendRequest):
    try:
        msg = engine.add_direct_message(req.sender_id, req.recipient_id, req.body, req.client_msg_id)
        # Real-time WebSocket delivery to recipient if online
        await ws_manager.send_event(req.recipient_id, "dm.receive", {
            "message": msg,
            "sender_id": req.sender_id
        })
        return {"status": "sent", "message": msg}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── WebSocket Ticketing & Gateway ──
@app.post("/api/ws/ticket")
def create_ws_ticket(req: TicketRequest):
    if req.user_id not in engine.users:
        user_data = engine.create_guest_user()
        req.user_id = user_data["user_id"]
    
    ticket = engine.generate_ws_ticket(req.user_id)
    return {"ticket": ticket, "expires_in": 30}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, ticket: str = Query(...)):
    user_id = engine.validate_ticket(ticket)
    if not user_id:
        await websocket.close(code=4003)
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            data_str = await websocket.receive_text()
            await handle_websocket_message(user_id, data_str)
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
    except Exception as e:
        print(f"WS Error for {user_id}: {e}")
        ws_manager.disconnect(user_id)

# ── Daily Vibe Question ──
@app.get("/api/daily")
def fetch_daily_question():
    return get_daily_question()

@app.post("/api/daily/answer")
def submit_daily_answer(req: DailyAnswerRequest):
    q = get_daily_question()
    return {
        "question_id": req.question_id,
        "your_choice": req.choice,
        "left_percent": q["left_percent"],
        "right_percent": q["right_percent"],
        "total_votes": q["total_votes"] + 1
    }

@app.post("/api/reports")
def report_user(req: ReportRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if rate_limiter.is_rate_limited(client_ip, "user_report", max_requests=5, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many reports submitted. Please wait a moment.")

    if req.honeypot:
        raise HTTPException(status_code=400, detail="Invalid report submission")

    clean_reason = sanitize_input(req.reason, max_length=500)
    report = engine.add_report(req.reporter_id or "usr_guest", req.target_id, req.room_id, clean_reason)
    return {"status": "submitted", "report_id": report["id"]}

# ── Public Share Card Page (OG Meta Tagged) ──
@app.get("/share/{share_hash}", response_class=HTMLResponse)
def get_share_card(share_hash: str):
    match = engine.share_match_map.get(share_hash)
    score_text = f"{match.vibe_score}/{match.round_count}" if match else "6/7"
    pct = round((match.vibe_score / match.round_count)*100) if match else 86
    site_url = os.getenv("VITE_SITE_URL") or os.getenv("FRONTEND_URL") or "https://wouldyoumatch.app"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>WouldYouMatch? Vibe Match — {score_text} Synergy 🔥</title>
      <meta property="og:title" content="WouldYouMatch? Vibe Match — {score_text} Synergy 🔥" />
      <meta property="og:description" content="We got a {pct}% Vibe Match on WouldYouMatch?! Play 7 quick choices and test your synergy." />
      <meta property="og:type" content="website" />
      <style>
        body {{ font-family: sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
        .card {{ background: #121217; border: 1px solid rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; text-align: center; max-width: 400px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }}
        .badge {{ background: #e03131; color: white; padding: 6px 16px; border-radius: 99px; font-weight: bold; display: inline-block; margin-bottom: 20px; }}
        .btn {{ background: #e03131; color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; display: inline-block; margin-top: 20px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">🔥 WouldYouMatch?</div>
        <h1>{score_text} Synergy! ({pct}%)</h1>
        <p>Two players answered 7 Would You Rather choices together and tested their compatibility.</p>
        <a href="{site_url}" class="btn">Play WouldYouMatch? Now</a>
      </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
