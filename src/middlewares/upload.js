import path from 'path';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

/**
 * Sanitize a filename base (no extension) for use as a Cloudinary public_id.
 * Replaces special characters with underscores, trims leading/trailing underscores.
 */
const sanitizeBase = (value = 'file') => {
  // Remove extension first
  const withoutExt = String(value).replace(/\.[^/.]+$/, '');
  return (
    withoutExt
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_') || 'file'
  );
};

/**
 * Configure Cloudinary Storage for resource files (PDF, Docs, Images).
 *
 * IMPORTANT: public_id must NOT include the extension when `format` is set.
 * Cloudinary appends the format as the URL extension automatically.
 * Including the extension in public_id causes doubled extensions (Notes.pdf.pdf).
 */
const resourceStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const originalName = file.originalname || 'file';
    const extension = path.extname(originalName).toLowerCase().replace('.', '');
    const baseOnly = sanitizeBase(originalName); // extension-free base name

    let folder = 'mnchub/others';
    if (file.mimetype.startsWith('image/')) {
      folder = 'mnchub/images';
    } else if (file.mimetype === 'application/pdf') {
      folder = 'mnchub/documents';
    } else if (
      file.mimetype.includes('word') ||
      file.mimetype.includes('presentation') ||
      file.mimetype === 'text/plain'
    ) {
      folder = 'mnchub/documents';
    }

    return {
      folder,
      // raw → preserves all non-image file types exactly
      resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
      // format adds the correct extension to the Cloudinary URL
      format: extension || undefined,
      // public_id is JUST the base — no extension — to avoid Notes.pdf.pdf
      public_id: `${Date.now()}-${baseOnly}`,
      // Store original filename as a Cloudinary context tag for traceability
      context: `original_name=${originalName}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only PDFs, Word docs, PowerPoint, text, zip files, and images are allowed.'
      ),
      false
    );
  }
};

const upload = multer({
  storage: resourceStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('images', 5);
