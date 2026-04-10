# ExitLens — Deployment Guide

## Prerequisites
- Node.js >= 18
- MongoDB Atlas account (or self-hosted)
- Gemini or OpenAI API key
- Render.com account (or any Node host)

---

## 1. Local Development

```bash
# Clone and install
git clone <repo>
cd saas-analytics

# Backend
cd backend
cp .env.example .env        # fill in values
npm install
npm run dev                 # starts on :4000

# Frontend (new terminal)
cd ../frontend
cp .env.example .env.local
npm install
npm start                   # starts on :3000
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 2. MongoDB Atlas Setup

1. Create cluster at https://cloud.mongodb.com
2. Create DB user with readWrite on `exitlens` database
3. Whitelist your server IP (or 0.0.0.0/0 for Render)
4. Copy connection string into `MONGODB_URI`

---

## 3. Deploy Backend to Render

1. Push code to GitHub
2. New Web Service → connect repo
3. **Root directory:** `backend`
4. **Build command:** `npm install`
5. **Start command:** `node server.js`
6. Add all env vars from `.env.example` under Environment

Render auto-restarts on crash and provides HTTPS.

---

## 4. Deploy Frontend to Render (Static Site)

1. New Static Site → connect same repo
2. **Root directory:** `frontend`
3. **Build command:** `npm install && npm run build`
4. **Publish directory:** `build`
5. Set `REACT_APP_API_URL` to your backend Render URL

---

## 5. PM2 (Self-hosted / VPS)

```bash
npm install -g pm2
cd saas-analytics
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # auto-start on reboot
```

---

## 6. Embed Tracker on Your Landing Page

```html
<script
  src="https://your-backend.onrender.com/analytics.js"
  data-api-key="el_your_api_key_here"
  data-endpoint="https://your-backend.onrender.com/track"
  async
></script>
```

---

## 7. Database Backup Strategy

**Atlas:** Enable continuous backup in cluster settings (M10+).
For free tier, use scheduled mongodump:

```bash
# Daily backup script (add to cron)
mongodump --uri="$MONGODB_URI" --out="./backups/$(date +%Y-%m-%d)"
# Upload to S3
aws s3 sync ./backups s3://your-bucket/exitlens-backups
```

---

## 8. Environment Variables Checklist

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGODB_URI` | ✅ | Atlas connection string |
| `JWT_SECRET` | ✅ | 64-byte hex, never reuse |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated frontend URLs |
| `AI_PROVIDER` | ✅ | `gemini` or `openai` |
| `GEMINI_API_KEY` | If using Gemini | |
| `OPENAI_API_KEY` | If using OpenAI | |
| `NODE_ENV` | ✅ | `production` in prod |

---

## 9. Load Testing (Basic)

Install autocannon:
```bash
npm install -g autocannon

# Test health endpoint
autocannon -c 100 -d 10 https://your-api.onrender.com/health

# Test track endpoint (replace key)
autocannon -c 50 -d 10 -m POST \
  -H "Content-Type: application/json" \
  -b '{"sessionId":"test","apiKey":"el_...","events":[]}' \
  https://your-api.onrender.com/track
```

Expected: health < 50ms p99, track < 200ms p99.
