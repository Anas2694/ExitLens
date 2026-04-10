const express = require("express");
const router = express.Router();
const insightController = require("../controllers/insightController");
const { authenticate } = require("../middleware/auth");
const { apiLimiter } = require("../middleware/rateLimiter");

router.use(authenticate);
router.use(apiLimiter);

router.get("/",                    insightController.listInsights);
router.get("/:sessionId",          insightController.getInsight);
router.post("/generate",           insightController.generateInsightForSession);

module.exports = router;
