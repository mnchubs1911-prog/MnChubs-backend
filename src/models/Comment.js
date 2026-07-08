/**
 * Comment Model
 * Threaded comments on resources with voting.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
      trim: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    resource: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
    },

    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },

    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ── Indexes ─────────────────────────────────────── */
commentSchema.index({ resource: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ author: 1 });

/* ── Virtuals ────────────────────────────────────── */
commentSchema.virtual('voteScore').get(function () {
  return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
});

const Comment = model('Comment', commentSchema);
export default Comment;
