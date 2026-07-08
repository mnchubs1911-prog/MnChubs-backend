/**
 * Marketplace Model
 * Buy/sell items between students.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const marketplaceSchema = new Schema(
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
      maxlength: 2000,
    },

    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['book', 'calculator', 'lab-equipment', 'electronics', 'other'],
    },

    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },

    negotiable: { type: Boolean, default: false },

    condition: {
      type: String,
      required: [true, 'Condition is required'],
      enum: ['new', 'like-new', 'good', 'fair'],
    },

    images: [{ type: String }], // Cloudinary URLs

    isSold: { type: Boolean, default: false },

    location: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ── Indexes ─────────────────────────────────────── */
marketplaceSchema.index({ category: 1, isSold: 1, createdAt: -1 });
marketplaceSchema.index({ seller: 1 });
marketplaceSchema.index({ title: 'text', description: 'text' });

const Marketplace = model('Marketplace', marketplaceSchema);
export default Marketplace;
