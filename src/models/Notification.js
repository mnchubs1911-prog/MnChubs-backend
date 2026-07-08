/**
 * Notification Model
 * In-app notifications for users.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: [
        'resource-approved',
        'new-comment',
        'new-answer',
        'mention',
        'connect-request',
        'system',
        'deadline-reminder',
      ],
    },

    message: {
      type: String,
      required: [true, 'Message is required'],
    },

    link: { type: String },

    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ── Indexes ─────────────────────────────────────── */
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = model('Notification', notificationSchema);
export default Notification;
