# ExitLens — Security Audit Report

## Audit Summary

Full codebase scan performed. 10 vulnerability classes reviewed.
All critical issues fixed before first commit.

---

## Findings & Fixes

### 1. JWT Stored in localStorage
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | HIGH — XSS attack steals token, full account takeover |
| **Before** | `localStorage.setItem('token', jwt)` |
| **After** | `res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'strict' })` |
| **File** | `src/controllers/authController.js` → `getCookieOptions()` |

---

### 2. CORS Wildcard in Production
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | HIGH — any site can make credentialed requests to your API |
| **Before** | `app.use(cors())` — defaults to `*` |
| **After** | Explicit origin whitelist from `ALLOWED_ORIGINS` env var; blocks unknown origins with 403 |
| **File** | `src/app.js` |

---

### 3. Missing Authentication on Protected Routes
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | CRITICAL — unauthenticated access to all user data |
| **Before** | No auth middleware on `/sessions`, `/insights` |
| **After** | `router.use(authenticate)` applied at router level; impossible to miss a route |
| **File** | `src/routes/sessions.js`, `src/routes/insights.js` |

---

### 4. Broken Object Level Authorization (IDOR)
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | CRITICAL — User A reads User B's sessions by guessing IDs |
| **Before** | `Session.findById(req.params.id)` — no userId filter |
| **After** | `Session.findOne({ _id: id, userId: req.userId })` — every query scoped to authenticated user |
| **File** | All controllers — `sessionController.js`, `insightController.js`, `trackController.js` |

---

### 5. Password Leaked in API Responses
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | HIGH — hashed password exposed, enables offline cracking |
| **Before** | `User.findById(id)` returns password field |
| **After** | `select: false` on password field in schema; `toJSON` transform deletes it; explicit `select('+password')` only in login |
| **File** | `src/models/User.js` |

---

### 6. No Input Validation
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | HIGH — injection attacks, oversized payloads crash server |
| **Before** | Raw `req.body` used directly in DB queries |
| **After** | Joi validation middleware on every route; `stripUnknown: true` removes unexpected fields; max lengths enforced |
| **File** | `src/middleware/validate.js` |

---

### 7. No Rate Limiting
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | HIGH — brute force login, credential stuffing, API abuse |
| **Before** | No limits anywhere |
| **After** | Auth: 5 req/15min; Track: 200 req/min keyed by API key; API: 100 req/15min |
| **File** | `src/middleware/rateLimiter.js` |

---

### 8. Hardcoded Secrets / Exposed API Keys
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | CRITICAL — anyone with repo access can use your keys |
| **Before** | Secrets in source code |
| **After** | All secrets in `.env` (gitignored); `.env.example` documents required vars; startup crash if required vars missing |
| **File** | `src/utils/config.js`, `.env.example`, `.gitignore` |

---

### 9. MongoDB Injection via String Concatenation
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | HIGH — `{ $where: "..." }` or operator injection |
| **Before** | Raw strings concatenated into queries |
| **After** | Mongoose ODM parameterizes all queries; Joi validates and strips `$` operators from input; API key format validated with regex before DB lookup |
| **File** | All models + `src/middleware/validate.js` |

---

### 10. Sensitive Data in Error Responses
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | MEDIUM — stack traces reveal internal paths, library versions |
| **Before** | `res.json({ error: err.stack })` |
| **After** | Generic messages in production; full detail only in development; centralized error handler |
| **File** | `src/middleware/errorHandler.js` |

---

### 11. Missing Security Headers
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | MEDIUM — clickjacking, MIME sniffing, missing HSTS |
| **Before** | No security headers |
| **After** | Helmet.js sets: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `X-XSS-Protection`, `Referrer-Policy` |
| **File** | `src/app.js` |

---

### 12. Timing Attack on Login
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | MEDIUM — attacker can enumerate valid emails by measuring response time |
| **Before** | Return early if user not found (fast path reveals email doesn't exist) |
| **After** | Always run `bcrypt.compare` even for unknown emails using a dummy hash |
| **File** | `src/controllers/authController.js` → `login()` |

---

### 13. Payload Size Not Limited
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | MEDIUM — giant JSON bodies cause OOM / ReDoS |
| **Before** | Default Express body parser (unlimited) |
| **After** | `express.json({ limit: '100kb' })` |
| **File** | `src/app.js` |

---

### 14. Session Events Not Capped
| | Detail |
|---|---|
| **Status** | ✅ Fixed |
| **Risk** | MEDIUM — malicious tracker can flood DB with millions of events |
| **Before** | Unbounded events array |
| **After** | Max 200 events per session enforced in schema validator + controller |
| **File** | `src/models/Session.js`, `src/controllers/trackController.js` |

---

## Security Architecture Summary

```
Browser
  │
  ├── Tracker Script → POST /track (API Key auth, rate limited 200/min)
  │
  └── React Dashboard → All requests via httpOnly cookie (JWT)
           │
           ▼
      Express API
        ├── Helmet (security headers)
        ├── CORS (whitelist only)
        ├── Body size limit (100kb)
        ├── Rate limiter (per-route)
        ├── Joi validation (strip unknowns)
        ├── Auth middleware (JWT or API key)
        ├── Controller (userId-scoped queries only)
        └── Mongoose (parameterized, no raw strings)
```

---

## Remaining Recommendations (Post-MVP)

- [ ] Add email verification flow
- [ ] Implement refresh token rotation
- [ ] Add request signing for tracker → API (HMAC)
- [ ] Set up CSP headers for dashboard
- [ ] Enable MongoDB Atlas audit logs
- [ ] Add 2FA for dashboard login
- [ ] Penetration test before public launch
