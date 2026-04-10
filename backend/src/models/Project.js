const mongoose = require("mongoose");
const crypto = require("crypto");

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [100, "Name must be under 100 characters"],
    },
    domain: {
      type: String,
      trim: true,
      maxlength: 253,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    apiKey: {
      type: String,
      unique: true,
      select: false,
    },
    // Conversion goal tracking
    conversionGoals: [
      {
        name: { type: String, maxlength: 100 },
        type: {
          type: String,
          enum: ["click", "page_visit", "custom_event"],
          default: "click",
        },
        value: { type: String, maxlength: 200 }, // element selector or page path or event name
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    color: {
      type: String,
      default: "#5b7fff",
      maxlength: 20,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        delete ret.apiKey;
        return ret;
      },
    },
  }
);

projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ apiKey: 1 });

// Generate unique API key for this project
projectSchema.methods.generateApiKey = function () {
  this.apiKey = "elp_" + crypto.randomBytes(32).toString("hex");
  return this.apiKey;
};

projectSchema.statics.findByApiKey = function (key) {
  return this.findOne({ apiKey: key, isActive: true, isDeleted: false }).select("+apiKey");
};

const Project = mongoose.model("Project", projectSchema);
module.exports = Project;