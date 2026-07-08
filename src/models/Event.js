/**
 * Event Model
 * Notices, exams, deadlines, scholarships, and events.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const eventSchema = new Schema(
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
      required: [true, 'Event type is required'],
      enum: ['notice', 'exam', 'deadline', 'scholarship', 'club-recruitment', 'event'],
    },

    date: {
      type: Date,
      required: [true, 'Date is required'],
    },

    endDate: { type: Date },

    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    branch: { type: String },
    semester: { type: Number, min: 1, max: 8 },

    attachments: [attachmentSchema],

    isImportant: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ── Indexes ─────────────────────────────────────── */
eventSchema.index({ date: 1, type: 1 });
eventSchema.index({ branch: 1, semester: 1 });
eventSchema.index({ title: 'text', description: 'text' });

const Event = model('Event', eventSchema);
export default Event;
