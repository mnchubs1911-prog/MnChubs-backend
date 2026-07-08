/**
 * Placement Model
 * Interview experiences, OA experiences, and placement data.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const roundSchema = new Schema(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['hr', 'technical', 'system-design', 'coding', 'aptitude'],
      required: true,
    },
    description: { type: String },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
    },
    questions: [{ type: String }],
  },
  { _id: false }
);

const placementSchema = new Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },

    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },

    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: ['internship', 'full-time', 'oa-experience'],
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    experience: {
      type: String,
      required: [true, 'Experience description is required'],
    },

    rounds: [roundSchema],

    stipend: { type: String },
    duration: { type: String },

    selectionProcess: { type: String },

    verdict: {
      type: String,
      enum: ['selected', 'rejected', 'waitlisted'],
    },

    tips: { type: String },

    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    tags: [{ type: String, trim: true, lowercase: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ── Indexes ─────────────────────────────────────── */
placementSchema.index({ companyName: 1 });
placementSchema.index({ type: 1, createdAt: -1 });
placementSchema.index({ companyName: 'text', role: 'text', tags: 'text' });

/* ── Virtuals ────────────────────────────────────── */
placementSchema.virtual('voteScore').get(function () {
  return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

const Placement = model('Placement', placementSchema);
export default Placement;
