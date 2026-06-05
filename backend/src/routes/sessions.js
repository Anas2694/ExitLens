const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const { authenticate } = require("../middleware/auth");
const { apiLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../middleware/validate");

router.use(authenticate);
router.use(apiLimiter);

router.get("/", validate(schemas.sessionQuery, "query"), sessionController.listSessions);
router.get("/stats", validate(schemas.sessionQuery, "query"), sessionController.getStats);
router.get("/heatmap", validate(schemas.sessionQuery, "query"), sessionController.getPageHeatmap);
router.get("/alerts", validate(schemas.sessionQuery, "query"), sessionController.getAlerts);
router.get("/export", validate(schemas.sessionQuery, "query"), sessionController.exportSessions);
router.get("/export-insights", sessionController.exportInsights);
router.get("/:id/replay", sessionController.getReplay);
router.get("/:id/heatmap", sessionController.getHeatmap);
router.get("/:id", sessionController.getSession);

module.exports = router;
