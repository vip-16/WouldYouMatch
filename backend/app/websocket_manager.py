"""
WouldYouMatch? WebSocket Gateway & Connection Manager
Handles real-time multiplexed WebSocket events strictly adhering to the technical contract.
"""
import json
import asyncio
import time
import logging
from typing import Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from app.game_engine import engine, MatchState

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_seq: Dict[str, int] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        previous = self.active_connections.get(user_id)
        if previous is not None and previous is not websocket:
            logger.info("Replacing existing WebSocket connection for user %s", user_id)
            try:
                await previous.close(code=4001, reason="Superseded by a newer connection")
            except Exception:
                logger.debug("Previous WebSocket for %s was already closed", user_id)
        self.active_connections[user_id] = websocket
        if user_id in engine.users:
            engine.users[user_id].websocket = websocket
            engine.users[user_id].connected = True
        self.user_seq[user_id] = 0

    def disconnect(self, user_id: str, websocket: Optional[WebSocket] = None):
        current = self.active_connections.get(user_id)
        # A replaced socket can finish its receive loop later. It must not
        # clear the newer socket or mark the user offline.
        if websocket is not None and current is not websocket:
            return
        if current is not None:
            del self.active_connections[user_id]
        if user_id in engine.users:
            engine.users[user_id].connected = False
            engine.users[user_id].websocket = None

    async def send_event(self, user_id: str, event_type: str, payload: Dict[str, Any]):
        ws = self.active_connections.get(user_id)
        if ws:
            self.user_seq[user_id] = self.user_seq.get(user_id, 0) + 1
            frame = {
                "type": event_type,
                "seq": self.user_seq[user_id],
                "ts": int(time.time()),
                "payload": payload
            }
            try:
                await ws.send_text(json.dumps(frame))
            except Exception:
                self.disconnect(user_id, ws)

    async def broadcast_to_match(self, match: MatchState, event_type: str, payload_func):
        for uid in match.players.keys():
            payload = payload_func(uid) if callable(payload_func) else payload_func
            await self.send_event(uid, event_type, payload)

ws_manager = ConnectionManager()

async def launch_match(match: MatchState):
    for uid, pstate in match.players.items():
        opponent_id = [o for o in match.players.keys() if o != uid][0]
        opp_state = match.players[opponent_id]
        
        await ws_manager.send_event(uid, "queue.matched", {
            "match_id": match.match_id,
            "share_hash": match.share_hash,
            "opponent": {
                "id": opp_state.user_id,
                "alias": opp_state.alias,
                "avatar_seed": opp_state.avatar_seed
            },
            "round_count": match.round_count
        })

    await asyncio.sleep(1.5)
    q = match.questions[0]
    await ws_manager.broadcast_to_match(match, "round.start", {
        "match_id": match.match_id,
        "round": 1,
        "question": {
            "id": q["id"],
            "left": q["left"],
            "right": q["right"]
        },
        "deadline_ts": int(time.time()) + 20
    })

async def handle_websocket_message(user_id: str, data_str: str):
    try:
        data = json.loads(data_str)
    except Exception:
        return

    event_type = data.get("type")
    payload = data.get("payload", {})

    if event_type == "pong":
        if user_id in engine.users:
            engine.users[user_id].last_active = time.time()
        return

    # Queue Join
    if event_type == "queue.join":
        logger.info("Queue join requested by user %s", user_id)
        match = engine.enqueue_player(user_id)
        if match:
            logger.info("Match %s created for users %s", match.match_id, list(match.players.keys()))
            await launch_match(match)
        else:
            logger.info("User %s is waiting for a match", user_id)
            await ws_manager.send_event(user_id, "queue.waiting", {"status": "searching"})

    elif event_type == "queue.leave":
        logger.info("Queue leave requested by user %s", user_id)
        engine.dequeue_player(user_id)
        await ws_manager.send_event(user_id, "queue.left", {})

    # Submit round answer
    elif event_type == "round.answer":
        match_id = payload.get("match_id")
        choice = payload.get("choice")
        
        if match_id in engine.matches:
            match = engine.matches[match_id]
            round_complete = match.submit_answer(user_id, choice)
            
            opponent_id = [o for o in match.players.keys() if o != user_id][0]
            await ws_manager.send_event(opponent_id, "opponent.answered", {
                "match_id": match_id,
                "round": match.current_round_idx + (0 if round_complete else 1)
            })

            if round_complete:
                last_result = match.answers[-1]
                p_ids = list(match.players.keys())

                # Strict Rule: round.result never reveals opponent choice before locking
                for uid in p_ids:
                    your_c = last_result["answers"].get(uid)
                    their_c = last_result["answers"].get([o for o in p_ids if o != uid][0])
                    
                    await ws_manager.send_event(uid, "round.result", {
                        "round": last_result["round"],
                        "your_choice": your_c,
                        "their_choice": their_c,
                        "agreed": last_result["agreed"],
                        "vibe_score": match.vibe_score
                    })

                await asyncio.sleep(2.5)

                if match.status == "completed":
                    engine.analytics_events["match_completed"] += 1
                    for uid in p_ids:
                        opp_id = [o for o in p_ids if o != uid][0]
                        opp = match.players[opp_id]
                        await ws_manager.send_event(uid, "match.complete", {
                            "match_id": match.match_id,
                            "share_hash": match.share_hash,
                            "vibe_score": match.vibe_score,
                            "round_count": match.round_count,
                            "room_id": match.room_id,
                            "icebreaker": match.chat_messages[0] if match.chat_messages else None,
                            "opponent": {
                                "id": opp.user_id,
                                "alias": opp.alias,
                                "avatar_seed": opp.avatar_seed
                            }
                        })
                else:
                    next_q = match.questions[match.current_round_idx]
                    await ws_manager.broadcast_to_match(match, "round.start", {
                        "match_id": match.match_id,
                        "round": match.current_round_idx + 1,
                        "question": {
                            "id": next_q["id"],
                            "left": next_q["left"],
                            "right": next_q["right"]
                        },
                        "deadline_ts": int(time.time()) + 20
                    })

    # Message send
    elif event_type == "message.send":
        match_id = payload.get("match_id") or payload.get("room_id", "").replace("room_", "")
        body = payload.get("body", "").strip()
        client_msg_id = payload.get("client_msg_id", "")
        
        if body and match_id in engine.matches:
            match = engine.matches[match_id]
            if len(match.chat_messages) <= 1:
                engine.analytics_events["first_message_sent"] += 1
                
            msg = match.add_message(user_id, body, client_msg_id)
            for uid in match.players.keys():
                await ws_manager.send_event(uid, "message.receive", msg)

    # Message Emoji Reaction
    elif event_type == "message.react":
        match_id = payload.get("match_id") or payload.get("room_id", "").replace("room_", "")
        msg_id = payload.get("msg_id")
        emoji = payload.get("emoji")
        
        if match_id in engine.matches and msg_id and emoji:
            match = engine.matches[match_id]
            result = match.add_reaction(msg_id, emoji, user_id)
            if result:
                for uid in match.players.keys():
                    await ws_manager.send_event(uid, "reaction.update", {
                        "room_id": match.room_id,
                        "msg_id": result["msg_id"],
                        "reactions": result["reactions"]
                    })

    # Read Receipts
    elif event_type == "message.read":
        match_id = payload.get("match_id") or payload.get("room_id", "").replace("room_", "")
        up_to_msg_id = payload.get("up_to_msg_id")
        if match_id in engine.matches:
            match = engine.matches[match_id]
            opp_id = [o for o in match.players.keys() if o != user_id][0]
            await ws_manager.send_event(opp_id, "read.update", {
                "room_id": match.room_id,
                "user_id": user_id,
                "up_to_msg_id": up_to_msg_id
            })

    # Typing status
    elif event_type in ["typing.start", "typing.stop"]:
        match_id = payload.get("match_id") or payload.get("room_id", "").replace("room_", "")
        if match_id in engine.matches:
            match = engine.matches[match_id]
            opp_id = [o for o in match.players.keys() if o != user_id][0]
            await ws_manager.send_event(opp_id, "typing.update", {
                "room_id": match.room_id,
                "user_id": user_id,
                "typing": (event_type == "typing.start")
            })

    # Reconnect State Synchronization
    elif event_type == "sync.request":
        last_seq = payload.get("last_seq", 0)
        match_id = engine.user_match_map.get(user_id)
        active_match = engine.matches.get(match_id) if match_id else None
        
        await ws_manager.send_event(user_id, "sync.state", {
            "user_id": user_id,
            "active_match": {
                "id": active_match.match_id,
                "status": active_match.status,
                "current_round": active_match.current_round_idx + 1,
                "vibe_score": active_match.vibe_score,
                "room_id": active_match.room_id
            } if active_match else None,
            "last_seq": last_seq
        })

    # Friend Request
    elif event_type == "connect.request":
        match_id = payload.get("match_id") or payload.get("room_id", "").replace("room_", "")
        if match_id in engine.matches:
            match = engine.matches[match_id]
            match.friend_requests[user_id] = "pending"
            
            p_ids = list(match.players.keys())
            opp_id = [o for o in p_ids if o != user_id][0]

            if opp_id in match.friend_requests:
                match.friends.add(user_id)
                match.friends.add(opp_id)
                engine.analytics_events["keep_connected_mutual"] += 1
                for uid in p_ids:
                    await ws_manager.send_event(uid, "connect.state", {
                        "room_id": match.room_id,
                        "state": "mutual"
                    })
            else:
                await ws_manager.send_event(opp_id, "connect.state", {
                    "room_id": match.room_id,
                    "state": "pending",
                    "from_alias": match.players[user_id].alias
                })
                await ws_manager.send_event(user_id, "connect.state", {
                    "room_id": match.room_id,
                    "state": "requested"
                })

    # Rematch Request
    elif event_type == "rematch.request":
        match_id = payload.get("match_id") or payload.get("room_id", "").replace("room_", "")
        if match_id in engine.matches:
            match = engine.matches[match_id]
            match.rematch_requests.add(user_id)
            
            p_ids = list(match.players.keys())
            opp_id = [o for o in p_ids if o != user_id][0]

            if len(match.rematch_requests) == 2:
                p1 = match.players[p_ids[0]]
                p2 = match.players[p_ids[1]]
                import uuid
                new_match_id = f"mch_{uuid.uuid4().hex[:10]}"
                new_match = MatchState(new_match_id, p1, p2, round_count=7)
                engine.matches[new_match_id] = new_match
                engine.share_match_map[new_match.share_hash] = new_match
                engine.user_match_map[p1.user_id] = new_match_id
                engine.user_match_map[p2.user_id] = new_match_id

                for uid in p_ids:
                    opp = p2 if uid == p1.user_id else p1
                    await ws_manager.send_event(uid, "queue.matched", {
                        "match_id": new_match.match_id,
                        "share_hash": new_match.share_hash,
                        "opponent": {
                            "id": opp.user_id,
                            "alias": opp.alias,
                            "avatar_seed": opp.avatar_seed
                        },
                        "round_count": new_match.round_count
                    })

                await asyncio.sleep(1.5)
                q = new_match.questions[0]
                await ws_manager.broadcast_to_match(new_match, "round.start", {
                    "match_id": new_match.match_id,
                    "round": 1,
                    "question": {
                        "id": q["id"],
                        "left": q["left"],
                        "right": q["right"]
                    },
                    "deadline_ts": int(time.time()) + 20
                })
            else:
                await ws_manager.send_event(opp_id, "rematch.state", {
                    "room_id": match.room_id,
                    "state": "pending",
                    "from_alias": match.players[user_id].alias
                })
                await ws_manager.send_event(user_id, "rematch.state", {
                    "room_id": match.room_id,
                    "state": "requested"
                })

    elif event_type == "chat.leave":
        match_id = payload.get("match_id") or payload.get("room_id", "").replace("room_", "")
        if match_id in engine.matches:
            match = engine.matches[match_id]
            opp_id = [o for o in match.players.keys() if o != user_id][0]
            await ws_manager.send_event(opp_id, "chat.closed", {
                "room_id": match.room_id,
                "by": "opponent"
            })
            await ws_manager.send_event(user_id, "chat.closed", {
                "room_id": match.room_id,
                "by": "you"
            })
            engine.leave_match(user_id)

    # ── Persistent 1:1 Direct Messaging Events ──
    elif event_type == "dm.send":
        recipient_id = payload.get("recipient_id")
        body = payload.get("body", "").strip()
        client_msg_id = payload.get("client_msg_id")
        if recipient_id and body:
            try:
                msg = engine.add_direct_message(user_id, recipient_id, body, client_msg_id)
                # Send to recipient
                await ws_manager.send_event(recipient_id, "dm.receive", {
                    "message": msg,
                    "sender_id": user_id
                })
                # Echo to sender
                await ws_manager.send_event(user_id, "dm.sent", {
                    "message": msg,
                    "client_msg_id": client_msg_id
                })
            except Exception as e:
                await ws_manager.send_event(user_id, "dm.error", {"detail": str(e)})

    elif event_type in ["dm.typing.start", "dm.typing.stop"]:
        recipient_id = payload.get("recipient_id")
        conversation_id = payload.get("conversation_id")
        if recipient_id:
            await ws_manager.send_event(recipient_id, "dm.typing", {
                "conversation_id": conversation_id,
                "from_user_id": user_id,
                "typing": (event_type == "dm.typing.start")
            })

    elif event_type == "dm.react":
        conversation_id = payload.get("conversation_id")
        msg_id = payload.get("msg_id")
        emoji = payload.get("emoji")
        recipient_id = payload.get("recipient_id")
        if conversation_id and msg_id and emoji:
            res = engine.add_dm_reaction(conversation_id, msg_id, emoji, user_id)
            if res:
                await ws_manager.send_event(user_id, "dm.reaction.update", {
                    "conversation_id": conversation_id,
                    "msg_id": msg_id,
                    "reactions": res["reactions"]
                })
                if recipient_id:
                    await ws_manager.send_event(recipient_id, "dm.reaction.update", {
                        "conversation_id": conversation_id,
                        "msg_id": msg_id,
                        "reactions": res["reactions"]
                    })

    elif event_type == "dm.read":
        conversation_id = payload.get("conversation_id")
        if conversation_id:
            engine.get_conversation_messages(conversation_id, user_id)
            await ws_manager.send_event(user_id, "dm.read.ack", {"conversation_id": conversation_id})

    # ── Live Duel Challenge Events ──
    elif event_type == "duel.challenge":
        target_id = payload.get("target_id")
        if target_id:
            try:
                res = engine.create_duel_challenge(user_id, target_id)
                ch = res["challenge"]
                if res["target_online"]:
                    await ws_manager.send_event(target_id, "duel.challenge", {
                        "challenge_id": ch["challenge_id"],
                        "challenger": {
                            "id": ch["challenger_id"],
                            "alias": ch["challenger_alias"],
                            "avatar_seed": ch["challenger_avatar_seed"]
                        },
                        "timestamp": ch["created_at"]
                    })
                await ws_manager.send_event(user_id, "duel.challenge.sent", {
                    "challenge_id": ch["challenge_id"],
                    "target_id": target_id,
                    "target_online": res["target_online"]
                })
            except Exception as e:
                await ws_manager.send_event(user_id, "duel.error", {"detail": str(e)})

    elif event_type == "duel.respond":
        challenge_id = payload.get("challenge_id")
        action = payload.get("action", "accept")
        if challenge_id:
            try:
                res = engine.respond_duel_challenge(challenge_id, user_id, action)
                if res.get("status") == "accepted":
                    match = res["match"]
                    await launch_match(match)
                elif res.get("status") == "declined":
                    challenger_id = res["challenger_id"]
                    await ws_manager.send_event(challenger_id, "duel.declined", {
                        "challenge_id": challenge_id,
                        "declined_by": user_id
                    })
            except Exception as e:
                await ws_manager.send_event(user_id, "duel.error", {"detail": str(e)})
