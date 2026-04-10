const express = require("express");
const router = express.Router();
const { track } = require("../controllers/trackController");
const { authenticateApiKey } = require("../middleware/auth");
const { trackLimiter } = require("../middleware/rateLimiter");

// Parse sendBeacon text/plain body as JSON
function parseBeaconBody(req, res, next) {
  if (typeof req.body === "string") {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      return res.status(400).json({ success: false, error: "Invalid JSON" });
    }
  }
  next();
}

// Validate minimally — just check sessionId and apiKey exist
function validateTrack(req, res, next) {
  const { sessionId, apiKey, events } = req.body || {};
  if (!sessionId || !apiKey) {
    return res.status(422).json({ success: false, error: "sessionId and apiKey required" });
  }
  if (!Array.isArray(events)) {
    return res.status(422).json({ success: false, error: "events must be an array" });
  }
  next();
}

router.post("/", trackLimiter, parseBeaconBody, authenticateApiKey, validateTrack, track);

module.exports = router;