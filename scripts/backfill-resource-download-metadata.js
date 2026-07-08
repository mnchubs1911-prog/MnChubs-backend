import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import Resource from '../src/models/Resource.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const getFileExtensionFromMimeType = (mimeType) => {
  const mimeMap = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'application/zip': 'zip',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
  };

  return mimeMap[mimeType] || '';
};

const connectDb = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI or MONGODB_URI is not set');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
};

const run = async () => {
  try {
    await connectDb();

    const resources = await Resource.find({
      $or: [
        { downloadName: { $exists: false } },
        { contentType: { $exists: false } },
        { originalName: { $exists: false } },
      ],
    });

    console.log(`Found ${resources.length} resources to update`);

    for (const resource of resources) {
      const mimeType = resource.mimeType || resource.fileType || 'application/octet-stream';
      const sourceName = resource.originalName || resource.fileName || resource.title || 'download';
      const inferredExtension = path.extname(String(sourceName)).toLowerCase().replace('.', '') || getFileExtensionFromMimeType(mimeType);
      const fileExtension = inferredExtension;
      const originalName = inferredExtension ? `${String(sourceName).replace(/\.[^/.]+$/, '')}.${inferredExtension}` : String(sourceName);

      resource.originalName = originalName;
      resource.fileName = originalName;
      resource.downloadName = originalName;
      resource.fileExtension = fileExtension;
      resource.contentType = mimeType;

      await resource.save();
    }

    console.log('Backfill completed successfully');
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
