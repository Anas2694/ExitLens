const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const { authenticate } = require("../middleware/auth");
const { apiLimiter } = require("../middleware/rateLimiter");

router.use(authenticate);
router.use(apiLimiter);

router.get("/",                          projectController.listProjects);
router.post("/",                         projectController.createProject);
router.get("/:id",                       projectController.getProject);
router.put("/:id",                       projectController.updateProject);
router.delete("/:id",                    projectController.deleteProject);
router.post("/:id/regenerate-key",       projectController.regenerateApiKey);
router.get("/:id/stats",                 projectController.getProjectStats);
router.post("/:id/goals",                projectController.addGoal);
router.delete("/:id/goals/:goalId",      projectController.deleteGoal);

module.exports = router;