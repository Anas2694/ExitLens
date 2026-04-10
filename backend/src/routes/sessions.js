const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const { authenticate } = require("../middleware/auth");
const { apiLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../middleware/validate");

router.use(authenticate);
router.use(apiLimiter);

router.get("/",           validate(schemas.sessionQuery, "query"), sessionController.listSessions);
router.get("/stats",      sessionController.getStats);
router.get("/:id/heatmap", sessionController.getHeatmap);   // ← ADD THIS
router.get("/:id",        sessionController.getSession);

module.exports = router;
