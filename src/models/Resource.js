/**
 * Resource Model
 * Academic resources uploaded by users – notes, PYQs, assignments, etc.
 */
import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema, model } = mongoose;

const previousVersionSchema = new Schema(
  {
    fileUrl: { type: String, required: true },
    version: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const resourceSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: [
        'notes',
        'pyq',
        'mid-sem',
        'end-sem',
        'assignment',
        'lab-file',
        'reference-book',
        'youtube-playlist',
        'survival-kit',
        'question-bank',
      ],
    },

    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },

    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 8,
    },

    branch: {
      type: String,
      required: [true, 'Branch is required'],
      enum: ['MnC'],
    },

    uploader: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /* ── File info (Cloudinary) ──────────────────── */
    fileUrl: { type: String, required: [true, 'File URL is required'] },
    filePublicId: { type: String },
    previewUrl: { type: String },
    fileSize: { type: Number }, // bytes
    fileType: { type: String },
    mimeType: { type: String },
    originalName: { type: String },
    fileName: { type: String },
    fileExtension: { type: String },

    tags: [{ type: String, trim: true, lowercase: true }],

    /* ── Engagement metrics ──────────────────────── */
    metrics: {
      views: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
    },

    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    /* ── Moderation ──────────────────────────────── */
    isApproved: { type: Boolean, default: true },

    /* ── Versioning ──────────────────────────────── */
    version: { type: Number, default: 1 },
    previousVersions: [previousVersionSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ── Indexes ─────────────────────────────────────── */
resourceSchema.index({ branch: 1, semester: 1, resourceType: 1 });
resourceSchema.index({ subject: 1 });
resourceSchema.index({ uploader: 1 });
resourceSchema.index({ isApproved: 1, createdAt: -1 });
resourceSchema.index({ title: 'text', description: 'text', tags: 'text' });

/* ── Virtuals ────────────────────────────────────── */
resourceSchema.virtual('voteScore').get(function () {
  return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

resourceSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'resource',
});

/* ── Pre-save: generate unique slug ──────────────── */
resourceSchema.pre('save', async function (next) {
  if (!this.isModified('title')) return next();

  let baseSlug = slugify(this.title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  // Ensure uniqueness
  const Resource = this.constructor;
  while (await Resource.exists({ slug, _id: { $ne: this._id } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  this.slug = slug;
  next();
});

const Resource = model('Resource', resourceSchema);
export default Resource;
