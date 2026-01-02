# WouldYouMatch? 🎭

> **Real-time Social Match & Dilemma Duels**  
> Test your subconscious compatibility through rapid-fire moral dilemmas, aesthetic choices, and philosophical duels.

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20TailwindCSS-blue.svg)](https://vitejs.dev)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20WebSockets%20%7C%20SQLite-green.svg)](https://fastapi.tiangolo.com)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success.svg)](https://wouldyoumatch.app)

---

## ✨ Features

- **⚡ Real-Time Dilemma Duels:** 7 rounds of instantaneous blind voting. Players reveal choices simultaneously with dynamic synergy score calculations.
- **🧠 Dynamic AI Dilemmas:** Powered by Google Gemini API with curated offline dilemma libraries as an automated fallback.
- **💬 Live Match Chat & Emojis:** Ephemeral in-game reactions and real-time chat with opponent typing indicators.
- **🤝 "You" Space & Social Graph:** Profile customization, avatar seeds, match history, and mutual synergy calculations.
- **✉️ Persistent Direct Messaging:** 1:1 messaging between matched friends with unread indicators and real-time delivery.
- **🛡️ Privacy & Security First:** Anonymous guest sessions, PBKDF2 salted password hashing, in-memory sliding-window IP rate limiting, anti-bot honeypots, and strict HSTS headers.
- **📱 Responsive & Accessible:** Dark mode by default, glassmorphic UI, full keyboard voting navigation (`Arrow keys` / `1 & 2`), WCAG compliance, and Web Audio API synthesized sound effects.
- **🚀 SEO & Compliance:** Schema.org JSON-LD, Open Graph social share cards, dynamic viral duel cards, `robots.txt`, `sitemap.xml`, and GDPR/CCPA cookie consent banners.

---

## 🏗️ Architecture

```
wouldyoumatch/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application, routing & WebSocket gateway
│   │   ├── game_engine.py       # User management, duel state machine & synergy logic
│   │   ├── websocket_manager.py # Real-time rooms, queue matchmaking & broadcasting
│   │   ├── db.py                # SQLite persistence with WAL mode & PBKDF2 auth
│   │   ├── questions.py         # Curated dilemma repository & daily rotations
│   │   ├── ai_questions.py      # Google Gemini AI dilemma generator
│   │   └── security.py          # HSTS, rate-limiting, sanitization & HTTPS redirect
│   ├── Dockerfile               # Container deployment specification
│   ├── Procfile                 # Process configuration for PaaS (Railway / Render)
│   └── requirements.txt         # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── components/          # Arena screens, modals, UI elements & legal views
    │   ├── services/            # API client, WebSocket gateway, analytics & audio
    │   ├── types.ts             # Strict TypeScript definitions
    │   ├── App.tsx              # Main application router & state coordinator
    │   └── index.css            # Tailwind directives, theme tokens & micro-animations
    ├── public/                  # Favicons, WebManifest, robots.txt, sitemap & OG assets
    └── vercel.json              # SPA routing, security headers & immutable caching
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run FastAPI dev server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env

# Run Vite dev server
npm run dev
```

The frontend will be live at `http://localhost:3000` and communicate with the backend at `http://localhost:8000`.

---

## 🔒 Security & Privacy

- **No Third-Party Tracking:** Zero invasive tracking scripts. Only privacy-first anonymous telemetry.
- **Cryptographic Password Storage:** Salted PBKDF2 iterations using HMAC-SHA256.
- **Ephemeral Match Data:** Raw in-game dilemma choices and ephemeral duel chats are not exposed publicly.
- **Comprehensive Headers:** Strict Content Security Policy, HSTS (`max-age=63072000`), `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff`.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
