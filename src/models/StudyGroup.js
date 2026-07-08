/**
 * StudyGroup Model
 * Collaborative study groups with shared resources and chat.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const memberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const studyGroupSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      maxlength: 1000,
    },

    subject: { type: String, trim: true },

    branch: {
      type: String,
      enum: ['MnC'],
    },

    semester: { type: Number, min: 1, max: 8 },

    admin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    members: [memberSchema],

    maxMembers: { type: Number, default: 20, min: 2, max: 100 },

    isPublic: { type: Boolean, default: true },

    resources: [{ type: Schema.Types.ObjectId, ref: 'Resource' }],

    chat: { type: Schema.Types.ObjectId, ref: 'Chat' },
  },
  { timestamps: true }
);

/* ── Indexes ─────────────────────────────────────── */
studyGroupSchema.index({ branch: 1, semester: 1 });
studyGroupSchema.index({ admin: 1 });
studyGroupSchema.index({ 'members.user': 1 });
studyGroupSchema.index({ name: 'text', subject: 'text' });

const StudyGroup = model('StudyGroup', studyGroupSchema);
export default StudyGroup;
