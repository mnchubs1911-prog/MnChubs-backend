/**
 * Chat Model
 * Supports direct messages and group chats with embedded messages.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    messageType: {
      type: String,
      enum: ['text', 'file', 'image'],
      default: 'text',
    },
    fileUrl: { type: String },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const chatSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      required: true,
    },

    participants: [
      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ],

    groupName: { type: String, trim: true },
    groupAdmin: { type: Schema.Types.ObjectId, ref: 'User' },

    messages: [messageSchema],

    lastMessage: {
      content: String,
      sender: { type: Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
);

/* ── Indexes ─────────────────────────────────────── */
chatSchema.index({ participants: 1 });
chatSchema.index({ 'lastMessage.createdAt': -1 });

const Chat = model('Chat', chatSchema);
export default Chat;
