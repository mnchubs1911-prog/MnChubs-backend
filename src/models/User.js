/**
 * User Model
 * Core user schema with profile, reputation, bookmarks, and auth helpers.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Schema, model } = mongoose;

/* ── Badge sub-schema ────────────────────────────── */
const badgeSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    earnedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ── Recently-viewed sub-schema ──────────────────── */
const recentlyViewedSchema = new Schema(
  {
    resource: { type: Schema.Types.ObjectId, ref: 'Resource' },
    viewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ── Main User schema ────────────────────────────── */
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },

    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned by default
    },

    avatar: {
      type: String,
      default: '',
    },

    googleId: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ['student', 'senior', 'moderator', 'admin'],
      default: 'student',
    },

    /* ── Extended profile ────────────────────────── */
    profile: {
      branch: {
        type: String,
        enum: ['MnC'],
      },
      semester: {
        type: Number,
        min: 1,
        max: 8,
      },
      bio: { type: String, maxlength: 500 },
      skills: [{ type: String, trim: true }],
      resume: { type: String },
      linkedin: { type: String },
      github: { type: String },
      phone: { type: String },
    },

    /* ── Reputation / Gamification ───────────────── */
    reputation: {
      points: { type: Number, default: 0 },
      badges: [badgeSchema],
      level: { type: Number, default: 1 },
    },

    /* ── Bookmarked resources ────────────────────── */
    bookmarks: [{ type: Schema.Types.ObjectId, ref: 'Resource' }],

    /* ── Email verification / Password reset ─────── */
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    /* ── Preferences ─────────────────────────────── */
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      darkMode: { type: Boolean, default: false },
    },

    /* ── Recently viewed (capped at 20) ──────────── */
    recentlyViewed: {
      type: [recentlyViewedSchema],
      default: [],
    },

    /* ── Connections ─────────────────────────────── */
    connections: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    connectionRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    /* ── Refresh token for token rotation ─────────── */
    refreshToken: { type: String, select: false },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ── Indexes ─────────────────────────────────────── */
userSchema.index({ email: 1 });
userSchema.index({ 'profile.branch': 1, 'profile.semester': 1 });
userSchema.index({ 'reputation.points': -1 });
userSchema.index({ role: 1, lastActiveAt: -1 });
userSchema.index({ name: 'text', 'profile.skills': 'text' });

/* ── Virtual: fullProfile ────────────────────────── */
userSchema.virtual('fullProfile').get(function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    role: this.role,
    profile: this.profile,
    reputation: this.reputation,
    createdAt: this.createdAt,
  };
});

/* ── Pre-save: hash password ─────────────────────── */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/* ── Pre-save: cap recentlyViewed at 20 ──────────── */
userSchema.pre('save', function (next) {
  if (this.recentlyViewed && this.recentlyViewed.length > 20) {
    this.recentlyViewed = this.recentlyViewed.slice(-20);
  }
  next();
});

/* ── Instance methods ────────────────────────────── */

/**
 * Compare a candidate password with the hashed password.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate a short-lived access token (JWT).
 * @returns {string}
 */
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

/**
 * Generate a long-lived refresh token (JWT).
 * @returns {string}
 */
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

const User = model('User', userSchema);
export default User;
