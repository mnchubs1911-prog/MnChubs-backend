import path from 'path';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const getFileMetadata = (file) => {
  const originalName = file.originalname || 'file';
  const extension = path.extname(originalName).toLowerCase().replace('.', '');
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
  const publicName = extension ? `${baseName}.${extension}` : baseName;

  return {
    extension,
    publicName,
    originalName,
  };
};

// Configure Cloudinary Storage for resource files (PDF, Docs, images)
const resourceStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const { extension, publicName } = getFileMetadata(file);
    let folder = 'mnchub/others';

    if (file.mimetype.startsWith('image/')) {
      folder = 'mnchub/images';
    } else if (file.mimetype === 'application/pdf') {
      folder = 'mnchub/documents';
    }

    return {
      folder,
      resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
      format: extension || undefined,
      public_id: `${Date.now()}-${publicName}`,
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
    cb(new Error('Invalid file type. Only PDFs, Word docs, Powerpoint slides, text, zip files, and images are allowed.'), false);
  }
};

const upload = multer({
  storage: resourceStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('images', 5);
