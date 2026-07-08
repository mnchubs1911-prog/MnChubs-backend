/**
 * Mentorship Model
 * Mentor-mentee relationships with sessions and feedback.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const feedbackSchema = new Schema(
  {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
  },
  { _id: false }
);

const sessionSchema = new Schema(
  {
    date: { type: Date, required: true },
    duration: { type: Number }, // minutes
    notes: { type: String },
    feedback: feedbackSchema,
  },
  { _id: true }
);

const mentorshipSchema = new Schema(
  {
    mentor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    mentee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },

    subject: { type: String, trim: true },
    description: { type: String, maxlength: 2000 },

    sessions: [sessionSchema],
  },
  { timestamps: true }
);

/* ── Indexes ─────────────────────────────────────── */
mentorshipSchema.index({ mentor: 1, status: 1 });
mentorshipSchema.index({ mentee: 1, status: 1 });

const Mentorship = model('Mentorship', mentorshipSchema);
export default Mentorship;
