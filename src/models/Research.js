/**
 * Research Model
 * Projects, papers, collaboration opportunities, and ideas.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const teamMemberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, trim: true },
  },
  { _id: false }
);

const researchSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: 5000,
    },

    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: ['project', 'paper', 'opportunity', 'idea', 'collaboration'],
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
    },

    category: [{ type: String, trim: true }],

    githubUrl: { type: String },
    liveUrl: { type: String },
    paperUrl: { type: String },

    teamMembers: [teamMemberSchema],

    isOpen: { type: Boolean, default: true },

    requiredSkills: [{ type: String, trim: true }],

    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ── Indexes ─────────────────────────────────────── */
researchSchema.index({ type: 1, createdAt: -1 });
researchSchema.index({ author: 1 });
researchSchema.index({ isOpen: 1 });
researchSchema.index({ title: 'text', description: 'text', requiredSkills: 'text' });

const Research = model('Research', researchSchema);
export default Research;
