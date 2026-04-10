// ── routes/auth.js ────────────────────────────────────────────────────────────
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../middleware/validate");

router.post("/register", authLimiter, validate(schemas.register), authController.register);
router.post("/login",    authLimiter, validate(schemas.login),    authController.login);
router.post("/logout",   authenticate,                             authController.logout);
router.get("/me",        authenticate,                             authController.getMe);
router.post("/regenerate-key", authenticate,                       authController.regenerateApiKey);

module.exports = router;
