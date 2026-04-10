# ExitLens 🔍

> Understand why users leave your landing page — in plain English.

ExitLens tracks visitor behavior (clicks, scroll depth, session time), detects patterns like rage clicks and bounce sessions, and uses AI to explain what went wrong in language any founder can understand.

---

## Quick Start

```bash
# 1. Install dependencies
cd backend  && npm install
cd ../frontend && npm install

# 2. Configure environment
cd ../backend
cp .env.example .env
# Edit .env — add MongoDB URI, JWT secret, AI key

# 3. Run
cd backend  && npm run dev    # API on :4000
cd frontend && npm start      # Dashboard on :3000
```

---

## Project Structure

```
saas-analytics/
├── tracker/
│   └── analytics.js          # Embed snippet (<3KB, zero deps)
│
├── backend/
│   ├── src/
│   │   ├── controllers/      # authController, trackController,
│   │   │                     # sessionController, insightController
│   │   ├── models/           # User, Session, Insight (Mongoose)
│   │   ├── routes/           # auth, track, sessions, insights
│   │   ├── middleware/       # auth (JWT+ApiKey), rateLimiter,
│   │   │                     # validate (Joi), errorHandler
│   │   ├── services/         # patternEngine, aiEngine
│   │   └── utils/            # logger (Winston), config
│   ├── tests/                # Integration + security tests
│   ├── server.js             # Entry with graceful shutdown
│   └── .env.example
│
├── frontend/
│   └── src/
│       ├── pages/            # Login, Register, Dashboard,
│       │                     # Sessions, SessionDetail,
│       │                     # Insights, Settings
│       ├── components/       # Layout, UI primitives
│       ├── hooks/            # useAuth, useData
│       ├── services/         # api.js (axios)
│       └── utils/            # format.js
│
├── docs/
│   ├── DEPLOYMENT.md
│   └── SECURITY_AUDIT.md
│
└── ecosystem.config.js       # PM2 cluster config
```

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account, returns API key |
| POST | `/auth/login` | — | Set httpOnly JWT cookie |
| POST | `/auth/logout` | JWT | Clear cookie |
| GET | `/auth/me` | JWT | Current user |
| POST | `/auth/regenerate-key` | JWT | New tracker API key |
| POST | `/track` | API Key | Receive batched events |
| GET | `/sessions` | JWT | List sessions (paginated) |
| GET | `/sessions/stats` | JWT | Aggregate metrics |
| GET | `/sessions/:id` | JWT | Single session detail |
| GET | `/insights` | JWT | List AI insights |
| GET | `/insights/:sessionId` | JWT | Insight for session |
| POST | `/insights/generate` | JWT | Trigger AI analysis |
| GET | `/health` | — | Uptime check |

---

## Embed on Your Landing Page

```html
<script
  src="https://your-api.com/analytics.js"
  data-api-key="el_your_key_here"
  data-endpoint="https://your-api.com/track"
  async
></script>
```

Optional custom events:
```js
ExitLens.track('cta_clicked', { variant: 'A' });
```

---

## Security Highlights

- ✅ JWT in httpOnly cookies (not localStorage)
- ✅ CORS whitelist only
- ✅ All routes protected with auth middleware
- ✅ IDOR prevented — every query scoped to `userId`
- ✅ Joi input validation + `stripUnknown` on all endpoints
- ✅ Rate limiting per route group
- ✅ Passwords never returned in responses (`select: false`)
- ✅ Timing-safe login (prevents email enumeration)
- ✅ Helmet security headers
- ✅ Payload size limits
- ✅ No hardcoded secrets — env var validation at startup

See `docs/SECURITY_AUDIT.md` for the full before/after audit.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT (httpOnly cookie) |
| Validation | Joi |
| AI | Gemini 1.5 Flash / GPT-4o Mini |
| Frontend | React 18 + React Router |
| Charts | Recharts |
| Logging | Winston + Daily Rotate |
| Process | PM2 cluster |
| Hosting | Render |

---

## License

MIT
