/**
 * Forum Model
 * Discussion posts with threaded answers and voting.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const answerSchema = new Schema(
  {
    content: {
      type: String,
      required: [true, 'Answer content is required'],
      maxlength: 5000,
    },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isAccepted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

answerSchema.virtual('voteScore').get(function () {
  return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

const forumSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    content: {
      type: String,
      required: [true, 'Content is required'],
      maxlength: 10000,
    },

    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'ask-seniors',
        'branch-discussion',
        'general',
        'doubt',
        'resource-request',
      ],
    },

    branch: {
      type: String,
      enum: ['MnC'],
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    isAnonymous: { type: Boolean, default: false },

    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    answers: [answerSchema],

    isResolved: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ── Indexes ─────────────────────────────────────── */
forumSchema.index({ category: 1, createdAt: -1 });
forumSchema.index({ branch: 1 });
forumSchema.index({ author: 1 });
forumSchema.index({ title: 'text', content: 'text', tags: 'text' });

/* ── Virtuals ────────────────────────────────────── */
forumSchema.virtual('voteScore').get(function () {
  return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

forumSchema.virtual('answerCount').get(function () {
  return this.answers?.length || 0;
});

const Forum = model('Forum', forumSchema);
export default Forum;
