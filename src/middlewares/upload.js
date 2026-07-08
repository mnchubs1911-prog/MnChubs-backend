import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Configure Cloudinary Storage for resource files (PDF, Docs, images)
const resourceStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'mnchub/others';
    let allowedFormats = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'zip', 'png', 'jpg', 'jpeg'];
    
    if (file.mimetype.startsWith('image/')) {
      folder = 'mnchub/images';
    } else if (file.mimetype === 'application/pdf') {
      folder = 'mnchub/documents';
    }

    return {
      folder: folder,
      resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw', // Use raw for non-image files like PDF
      public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`,
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
