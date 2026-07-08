/**
 * Subject Model
 * Academic subjects linked to resources.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const subjectSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },

    code: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      uppercase: true,
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

    description: {
      type: String,
      maxlength: 1000,
    },

    resources: [{ type: Schema.Types.ObjectId, ref: 'Resource' }],
  },
  { timestamps: true }
);

/* ── Indexes ─────────────────────────────────────── */
subjectSchema.index({ branch: 1, semester: 1 });
subjectSchema.index({ name: 'text', code: 'text' });

const Subject = model('Subject', subjectSchema);
export default Subject;
