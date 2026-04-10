const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name must be under 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      maxlength: [254, "Email must be under 254 characters"],
    },
    // ✅ SECURITY: password is NEVER returned in queries by default
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never included in query results unless explicitly selected
    },
    // API key for tracker script authentication (different from user JWT)
    apiKey: {
      type: String,
      unique: true,
      sparse: true,
      select: false, // hidden from default responses
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // For future email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: Date,
    // Track sites this user is monitoring (multi-tenant)
    sites: [
      {
        domain: { type: String, trim: true, maxlength: 253 },
        name: { type: String, trim: true, maxlength: 100 },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    // ✅ SECURITY: strip password + apiKey from ALL toJSON/toObject conversions
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.apiKey;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.apiKey;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ apiKey: 1 });

// ── Pre-save hook: hash password ──────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

// ── Methods ───────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  // 'this.password' requires explicit select('+password') in the query
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.generateApiKey = function () {
  this.apiKey = "el_" + crypto.randomBytes(32).toString("hex");
  return this.apiKey;
};

// ── Statics ───────────────────────────────────────────────────────────────────
userSchema.statics.findByApiKey = function (key) {
  return this.findOne({ apiKey: key, isActive: true }).select("+apiKey");
};

const User = mongoose.model("User", userSchema);
module.exports = User;
