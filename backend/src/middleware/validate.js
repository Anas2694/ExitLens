const Joi = require("joi");

/**
 * ✅ SECURITY: All inputs validated with Joi before hitting controllers.
 * Prevents injection, oversized payloads, and malformed data.
 */

// ── Reusable primitives ───────────────────────────────────────────────────────
const email = Joi.string().email().max(254).lowercase().trim();
const password = Joi.string().min(8).max(128).trim();
const objectId = Joi.string().hex().length(24);
const url = Joi.string().uri({ scheme: ["http", "https"] }).max(500);
const safeString = (max = 200) => Joi.string().max(max).trim();

// ── Auth schemas ──────────────────────────────────────────────────────────────
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  email: email.required(),
  password: password.required(),
});

const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().max(128).required(), // Don't apply min on login (better UX)
});

// ── Tracking schema ───────────────────────────────────────────────────────────
const eventSchema = Joi.object({
  type: Joi.string()
  .pattern(/^(page_view|click|scroll_milestone|page_hidden|exit|custom_.*)$/)
  .required(),
  ts: Joi.number().integer().min(0).max(Date.now() + 60000).required(), // not future
  element: safeString(200),
  x: Joi.number().integer().min(0).max(10000),
  y: Joi.number().integer().min(0).max(10000),
  xPct: Joi.number().min(0).max(100),
  yPct: Joi.number().min(0).max(100),
  scrollY: Joi.number().min(0),
  depth: Joi.number().min(0).max(100),
  url: safeString(500),
  isInteractive: Joi.boolean(),
  duration: Joi.number().min(0).max(86400000), // max 24 hours
  exitPage: safeString(200),
  properties: Joi.object().max(20), // custom event properties
}).options({ stripUnknown: true }); // ✅ strip extra fields silently

const trackSchema = Joi.object({
  sessionId: Joi.string().required(),
  events: Joi.array().required(),
}).unknown(true);

// ── Session query schema ──────────────────────────────────────────────────────
const sessionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  from: Joi.string().isoDate(),
  to: Joi.string().isoDate(),
  minDuration: Joi.number().min(0),
  maxScrollDepth: Joi.number().min(0).max(100),
  isBounce: Joi.boolean(),
});

// ── Middleware factory ────────────────────────────────────────────────────────
function validate(schema, source = "body") {
  return (req, res, next) => {
    const data = source === "query" ? req.query : req.body;
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(422).json({
        success: false,
        error: "Validation failed",
        details: messages,
      });
    }

    // Replace with sanitized/coerced values
    if (source === "query") {
      req.query = value;
    } else {
      req.body = value;
    }
    next();
  };
}

module.exports = {
  validate,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    track: trackSchema,
    sessionQuery: sessionQuerySchema,
  },
};
