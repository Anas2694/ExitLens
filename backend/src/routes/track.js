const express = require("express");
const router = express.Router();
const { track } = require("../controllers/trackController");
const { authenticateApiKey } = require("../middleware/auth");
const { trackLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../middleware/validate");

// POST /track — receives batched events from the embed script
router.post("/", trackLimiter, validate(schemas.track), authenticateApiKey, track);

module.exports = router;
