const Project = require("../models/Project");
const Session = require("../models/Session");
const logger = require("../utils/logger");

// GET /projects
async function listProjects(req, res) {
  const projects = await Project.find({
    userId: req.userId,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  return res.status(200).json({ success: true, data: { projects } });
}

// POST /projects
async function createProject(req, res) {
  const { name, domain, description, color } = req.body;

  if (!name || name.trim().length < 1) {
    return res.status(422).json({ success: false, error: "Project name is required" });
  }

  const project = new Project({
    userId: req.userId,
    name: name.trim().slice(0, 100),
    domain: domain?.trim().slice(0, 253),
    description: description?.trim().slice(0, 300),
    color: color || "#5b7fff",
  });

  const rawApiKey = project.generateApiKey();
  await project.save();

  logger.info("Project created", { userId: req.userId.toString(), projectId: project._id });

  return res.status(201).json({
    success: true,
    data: {
      project,
      apiKey: rawApiKey, // shown once
      message: "Save this API key — it will only be shown once.",
    },
  });
}

// GET /projects/:id
async function getProject(req, res) {
  const project = await Project.findOne({
    _id: req.params.id,
    userId: req.userId,
    isDeleted: false,
  });

  if (!project) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }

  return res.status(200).json({ success: true, data: { project } });
}

// PUT /projects/:id
async function updateProject(req, res) {
  const { name, domain, description, color } = req.body;

  const project = await Project.findOne({
    _id: req.params.id,
    userId: req.userId,
    isDeleted: false,
  });

  if (!project) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }

  if (name) project.name = name.trim().slice(0, 100);
  if (domain !== undefined) project.domain = domain.trim().slice(0, 253);
  if (description !== undefined) project.description = description.trim().slice(0, 300);
  if (color) project.color = color;

  await project.save();

  return res.status(200).json({ success: true, data: { project } });
}

// DELETE /projects/:id
async function deleteProject(req, res) {
  const project = await Project.findOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!project) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }

  project.isDeleted = true;
  await project.save();

  logger.info("Project deleted", { userId: req.userId.toString(), projectId: project._id });

  return res.status(200).json({ success: true, message: "Project deleted" });
}

// POST /projects/:id/regenerate-key
async function regenerateApiKey(req, res) {
  const project = await Project.findOne({
    _id: req.params.id,
    userId: req.userId,
    isDeleted: false,
  }).select("+apiKey");

  if (!project) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }

  const newKey = project.generateApiKey();
  await project.save();

  return res.status(200).json({
    success: true,
    data: { apiKey: newKey, message: "New API key generated. Update your tracker script." },
  });
}

// GET /projects/:id/stats
async function getProjectStats(req, res) {
  const project = await Project.findOne({
    _id: req.params.id,
    userId: req.userId,
    isDeleted: false,
  });

  if (!project) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }

  const stats = await Session.aggregate([
    { $match: { projectId: project._id, isDeleted: false } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        avgDuration: { $avg: "$duration" },
        avgScrollDepth: { $avg: "$maxScrollDepth" },
        bounces: { $sum: { $cond: ["$patterns.isBounce", 1, 0] } },
        conversions: { $sum: { $size: { $ifNull: ["$conversions", []] } } },
        totalClicks: { $sum: "$totalClicks" },
      },
    },
    {
      $project: {
        _id: 0,
        totalSessions: 1,
        avgDurationMs: { $round: ["$avgDuration", 0] },
        avgScrollDepthPct: { $round: ["$avgScrollDepth", 1] },
        bounceRate: {
          $round: [
            { $multiply: [{ $divide: ["$bounces", { $max: ["$totalSessions", 1] }] }, 100] },
            1,
          ],
        },
        totalConversions: "$conversions",
        conversionRate: {
          $round: [
            { $multiply: [{ $divide: ["$conversions", { $max: ["$totalSessions", 1] }] }, 100] },
            1,
          ],
        },
        totalClicks: 1,
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    data: { project, stats: stats[0] || {} },
  });
}

// POST /projects/:id/goals  — add conversion goal
async function addGoal(req, res) {
  const { name, type, value } = req.body;

  if (!name || !type || !value) {
    return res.status(422).json({ success: false, error: "name, type, and value are required" });
  }

  const project = await Project.findOne({
    _id: req.params.id,
    userId: req.userId,
    isDeleted: false,
  });

  if (!project) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }

  project.conversionGoals.push({ name, type, value });
  await project.save();

  return res.status(201).json({ success: true, data: { project } });
}

// DELETE /projects/:id/goals/:goalId
async function deleteGoal(req, res) {
  const project = await Project.findOne({
    _id: req.params.id,
    userId: req.userId,
    isDeleted: false,
  });

  if (!project) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }

  project.conversionGoals = project.conversionGoals.filter(
    (g) => g._id.toString() !== req.params.goalId
  );
  await project.save();

  return res.status(200).json({ success: true, data: { project } });
}

module.exports = {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  regenerateApiKey,
  getProjectStats,
  addGoal,
  deleteGoal,
};