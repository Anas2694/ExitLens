require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const morgan = require("morgan");

const config = require("./utils/config");
const logger = require("./utils/logger");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes     = require("./routes/auth");
const trackRoutes    = require("./routes/track");
const sessionRoutes  = require("./routes/sessions");
const insightRoutes  = require("./routes/insights");
const projectRoutes  = require("./routes/projects");
const path = require("path");

const app = express();

// ── Serve Tracker Script ───────────────────────────────────────────────
app.use("/cdn", express.static(path.join(__dirname, "../../tracker")));


// ── Security Headers (Helmet) ─────────────────────────────────────────────────
// ✅ SECURITY: Sets X-Frame-Options, X-XSS-Protection, HSTS, etc.
app.use(helmet({
  contentSecurityPolicy: config.isProd ? undefined : false, // relax in dev
  crossOriginEmbedderPolicy: false, // needed for tracker script to be embeddable
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
// ✅ SECURITY: Whitelist only — never wildcard * in production
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);

    if (config.cors.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn("CORS blocked request", { origin });
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,           // required for httpOnly cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Api-Key"],
  maxAge: 86400,               // pre-flight cache 24h
}));

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Body Parsing ──────────────────────────────────────────────────────────────
// ✅ SECURITY: Limit payload size to prevent ReDoS / memory exhaustion
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));

// ── Cookie Parser ─────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── HTTP Request Logging ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", { stream: logger.stream }));
}

// ── Trust Proxy (Render / Heroku) ─────────────────────────────────────────────
// Needed for accurate IP-based rate limiting behind a reverse proxy
if (config.isProd) {
  app.set("trust proxy", 1);
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.status(200).json({
    status: "ok",
    env: config.env,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/auth",     authRoutes);
app.use("/track",    trackRoutes);
app.use("/sessions", sessionRoutes);
app.use("/insights", insightRoutes);
app.use("/projects", projectRoutes);
// ── 404 + Error Handlers ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);



module.exports = app;
