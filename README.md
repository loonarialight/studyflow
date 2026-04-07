# StudyFlow 📚

> Educational platform with AI assistant, focus tracking, group study rooms and Google Calendar sync

![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20PostgreSQL-7C6FE0)
![CI](https://github.com/loonarialight/studyflow/actions/workflows/ci.yml/badge.svg)

---

## Features

| Module | Description |
|---|---|
| 📅 **Calendar** | Weekly view, event creation, Google Calendar sync |
| ✅ **Planner** | Daily tasks with categories and priorities |
| ⏱ **Tracking** | Live timer, Pomodoro, session history |
| 📖 **Learn** | Lessons with theory + YouTube + tests (grades 5–12) |
| 📊 **Analytics** | Streak, heatmap, weekly charts |
| 👥 **Groups** | Public study groups, rankings, live chat |
| 🤖 **AI Chat** | Gemini-powered assistant — scheduling, tags, advice |

---

## Tech Stack

### Backend
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express.js
- **ORM**: Prisma (PostgreSQL)
- **Cache**: Redis (ioredis)
- **Auth**: JWT + Google OAuth 2.0
- **Realtime**: Socket.io
- **AI**: Google Gemini 1.5 Flash
- **Docs**: Swagger / OpenAPI 3.0
- **External**: Google Calendar API

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **State**: Zustand + React Query
- **Router**: React Router v6
- **Charts**: Recharts
- **Realtime**: Socket.io-client

---

## Quick Start

### 1. Prerequisites
```bash
node >= 20
docker + docker-compose
git + gh CLI  # for GitHub setup
```

### 2. Clone & install
```bash
git clone https://github.com/loonarialight/studyflow
cd studyflow
npm run install:all
```

### 3. Configure environment
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in `backend/.env`:
```env
DATABASE_URL="postgresql://studyflow:studyflow_pass@localhost:5432/studyflow_db"
JWT_SECRET=your_secret_here
GEMINI_API_KEY=from_aistudio.google.com
GOOGLE_CLIENT_ID=from_console.cloud.google.com
GOOGLE_CLIENT_SECRET=from_console.cloud.google.com
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
```

### 4. Start databases
```bash
docker-compose up -d
# PostgreSQL on :5432, Redis on :6379, Adminer on :8080
```

### 5. Run migrations & seed
```bash
npm run db:migrate
npm run db:seed
```

### 6. Start dev servers
```bash
npm run dev
# Backend:  http://localhost:4000
# Frontend: http://localhost:5173
# Swagger:  http://localhost:4000/api/docs
# Adminer:  http://localhost:8080
```

---

## API Documentation (Swagger)

Available at **`http://localhost:4000/api/docs`**

All endpoints documented with request/response schemas.
Click **Authorize** → paste your JWT token to test protected routes.

### Quick API reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register with email |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/google` | Google OAuth URL |
| POST | `/api/tracking/sessions` | Start study session |
| PATCH | `/api/tracking/sessions/:id/stop` | Stop session |
| GET | `/api/analytics/weekly` | Weekly stats + streak |
| GET | `/api/analytics/heatmap` | Activity heatmap data |
| GET | `/api/calendar/events` | Get events |
| POST | `/api/calendar/sync` | Sync from Google Calendar |
| GET | `/api/groups` | List public groups |
| POST | `/api/groups/:id/join` | Join a group |
| GET | `/api/ai/chats` | List AI chats |
| POST | `/api/ai/chats/:id/messages` | Send message to AI |

---

## Google API Setup

### 1. Google Cloud Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project: `studyflow`
3. Enable APIs:
   - **Google Calendar API**
   - **Google OAuth 2.0**
4. Create credentials → **OAuth 2.0 Client ID** (Web application)
5. Add redirect URI: `http://localhost:4000/api/auth/google/callback`
6. Copy `Client ID` and `Client Secret` → paste in `.env`

### 2. Gemini AI
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create API key → paste as `GEMINI_API_KEY` in `.env`

> Both are **free** for development usage.

---

## WebSocket Events

```typescript
// Client → Server
socket.emit('group:join', groupId)
socket.emit('chat:message', { groupId, content })
socket.emit('focus:start', { groupId, subject })
socket.emit('focus:stop', groupId)

// Server → Client
socket.on('chat:message', (message) => { ... })
socket.on('focus:update', ({ type, user, participants }) => { ... })
socket.on('group:user_joined', ({ userId, name }) => { ... })
```

---

## Project Structure

```
studyflow/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # All DB models
│   │   └── seed.ts           # Sample data
│   └── src/
│       ├── modules/          # Feature modules
│       │   ├── auth/         # JWT + Google OAuth
│       │   ├── tracking/     # Sessions + timer
│       │   ├── calendar/     # Events + Google sync
│       │   ├── analytics/    # Stats + heatmap
│       │   ├── groups/       # Groups + chat
│       │   └── ai/           # Gemini chatbot
│       ├── config/           # DB, Redis, Swagger, env
│       ├── middleware/        # Auth, error handler
│       ├── socket/           # Socket.io handlers
│       └── app.ts            # Entry point
└── frontend/
    └── src/
        ├── api/              # Axios client + endpoints
        ├── pages/            # Route components
        ├── shared/           # UI components + layout
        ├── store/            # Zustand stores
        └── socket/           # WS client
```

---

## Deploy to Production

### Backend → Railway
```bash
# Install Railway CLI
npm i -g @railway/cli
railway login
railway init
railway up
```

### Frontend → Vercel
```bash
npm i -g vercel
cd frontend
vercel
```

### Add GitHub secrets for auto-deploy:
- `RAILWAY_TOKEN`
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## Push to GitHub

```bash
bash scripts/setup-github.sh
```

This creates the repo, makes the initial commit, and pushes everything automatically.

---

## License

MIT © StudyFlow Team
