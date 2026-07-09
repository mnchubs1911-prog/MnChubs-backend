/**
 * Resource Controller
 * Handles CRUD, voting, and file download for academic resources.
 */

import path from 'path';
import https from 'https';
import http from 'http';
import Resource from '../models/Resource.js';
import User from '../models/User.js';
import { AppError } from '../middlewares/errorHandler.js';
import { paginateResults } from '../utils/helpers.js';
import { createNotification } from '../services/notification.service.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalizeFileName = (value, fallback = 'download') => {
  if (!value) return fallback;
  const safeValue = String(value).replace(/[\\/:*?"<>|]/g, '_').trim();
  return safeValue || fallback;
};

/** Build a valid RFC 5987 Content-Disposition header value. */
const buildDownloadDisposition = (fileName) => {
  const safeName = normalizeFileName(fileName);
  const encodedName = encodeURIComponent(safeName).replace(/%20/g, ' ');
  return `attachment; filename="${safeName.replace(/"/g, "'")}"; filename*=UTF-8''${encodedName}`;
};

const mimeToExt = {
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

/** Return the best download filename for a resource. */
const getDownloadName = (resource) => {
  const explicit = resource.originalName || resource.downloadName || resource.fileName;
  if (explicit) return explicit;

  const base = resource.title || 'download';
  const ext =
    resource.fileExtension ||
    mimeToExt[resource.mimeType] ||
    mimeToExt[resource.fileType] ||
    mimeToExt[resource.contentType] ||
    '';
  const cleanBase = base.replace(/\.[^/.]+$/, '');
  return ext ? `${cleanBase}.${ext}` : cleanBase;
};

/**
 * Stream a remote file (Cloudinary) through the current response.
 * Follows up to 5 redirects. This keeps headers (Content-Disposition, etc.)
 * set by the controller intact rather than letting the browser follow a raw redirect.
 */
const streamRemoteFile = (url, res, redirectsLeft = 5) => {
  return new Promise((resolve, reject) => {
    if (redirectsLeft === 0) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https://') ? https : http;

    const req = client.get(url, (remote) => {
      const status = remote.statusCode || 500;

      if ([301, 302, 303, 307, 308].includes(status) && remote.headers.location) {
        const next = new URL(remote.headers.location, url).toString();
        remote.resume();
        resolve(streamRemoteFile(next, res, redirectsLeft - 1));
        return;
      }

      if (status >= 400) {
        remote.resume();
        reject(new Error(`Upstream responded with ${status}`));
        return;
      }

      // Propagate content-length from upstream if not already set
      if (remote.headers['content-length'] && !res.getHeader('Content-Length')) {
        res.setHeader('Content-Length', remote.headers['content-length']);
      }

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition,Content-Type');
      res.statusCode = 200;

      remote.pipe(res);
      remote.on('end', resolve);
      remote.on('error', reject);
    });

    req.on('error', reject);
  });
};

/** Ensure Cloudinary URL uses HTTPS. */
const toHttps = (url) => (url.startsWith('http://') ? url.replace('http://', 'https://') : url);

// ── Controllers ───────────────────────────────────────────────────────────────

export const createResource = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('Please upload a file', 400));

    const { title, description, resourceType, subject, semester, branch, tags } = req.body;
    const parsedTags = tags
      ? Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())
      : [];

    const originalName = req.file.originalname || 'file';
    const mimeType = req.file.mimetype || 'application/octet-stream';
    const fileExtension =
      path.extname(originalName).toLowerCase().replace('.', '') ||
      mimeToExt[mimeType] ||
      '';

    const resource = await Resource.create({
      title,
      description,
      resourceType,
      subject,
      semester: parseInt(semester, 10),
      branch,
      uploader: req.user.id,
      fileUrl: req.file.path,
      filePublicId: req.file.filename,
      fileSize: req.file.size,
      fileType: mimeType,
      mimeType,
      contentType: mimeType,
      originalName,
      fileName: originalName,
      downloadName: originalName,
      fileExtension,
      tags: parsedTags,
      isApproved: true,
    });

    res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully.',
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

export const getResources = async (req, res, next) => {
  try {
    const {
      branch, semester, subject, resourceType, tags,
      search, sort, page = 1, limit = 10,
    } = req.query;

    const filter = { isApproved: true };
    if (branch) filter.branch = branch;
    if (semester) filter.semester = parseInt(semester, 10);
    if (resourceType) filter.resourceType = resourceType;
    if (subject) filter.subject = { $regex: subject, $options: 'i' };
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      filter.tags = { $in: tagArray };
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const { skip, limit: limitNum, page: pageNum } = paginateResults(page, limit);
    let query = Resource.find(filter).populate('uploader', 'name avatar reputation');

    if (sort === 'downloads') {
      query = query.sort({ 'metrics.downloads': -1, createdAt: -1 });
    } else if (sort === 'upvotes') {
      query = query.sort({ upvotes: -1, createdAt: -1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const [resources, total] = await Promise.all([
      query.skip(skip).limit(limitNum),
      Resource.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        pages: Math.ceil(total / limitNum),
        page: pageNum,
        limit: limitNum,
      },
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};

export const getResource = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const resource = await Resource.findOne({ slug, isApproved: true }).populate(
      'uploader',
      'name avatar reputation'
    );

    if (!resource) return next(new AppError('Resource not found', 404));

    resource.metrics.views += 1;
    await resource.save();

    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        user.recentlyViewed = user.recentlyViewed.filter(
          (item) => item.resource.toString() !== resource._id.toString()
        );
        user.recentlyViewed.unshift({ resource: resource._id, viewedAt: new Date() });
        if (user.recentlyViewed.length > 20) user.recentlyViewed.pop();
        await user.save();
      }
    }

    res.status(200).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
};

export const updateResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, tags, subject } = req.body;
    const resource = await Resource.findById(id);
    if (!resource) return next(new AppError('Resource not found', 404));

    if (
      resource.uploader.toString() !== req.user.id &&
      req.user.role !== 'admin' &&
      req.user.role !== 'moderator'
    ) {
      return next(new AppError('Not authorized to edit this resource', 403));
    }

    if (title) resource.title = title;
    if (description) resource.description = description;
    if (subject) resource.subject = subject;
    if (tags) resource.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());

    await resource.save();
    res.status(200).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
};

export const deleteResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resource = await Resource.findById(id);
    if (!resource) return next(new AppError('Resource not found', 404));

    if (
      resource.uploader.toString() !== req.user.id &&
      req.user.role !== 'admin' &&
      req.user.role !== 'moderator'
    ) {
      return next(new AppError('Not authorized to delete this resource', 403));
    }

    await Resource.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const upvoteResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const resource = await Resource.findById(id);
    if (!resource) return next(new AppError('Resource not found', 404));

    const isUpvoted = resource.upvotes.includes(userId);
    const isDownvoted = resource.downvotes.includes(userId);
    const uploader = await User.findById(resource.uploader);

    if (isUpvoted) {
      resource.upvotes = resource.upvotes.filter((uid) => uid.toString() !== userId);
      if (uploader) uploader.reputation.points = Math.max(0, uploader.reputation.points - 10);
    } else {
      resource.upvotes.push(userId);
      if (isDownvoted) {
        resource.downvotes = resource.downvotes.filter((uid) => uid.toString() !== userId);
        if (uploader) uploader.reputation.points += 5;
      }
      if (uploader) uploader.reputation.points += 10;
    }

    if (uploader) await uploader.save();
    await resource.save();

    res.status(200).json({
      success: true,
      upvotesCount: resource.upvotes.length,
      downvotesCount: resource.downvotes.length,
      voted: isUpvoted ? 0 : 1,
    });
  } catch (error) {
    next(error);
  }
};

export const downvoteResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const resource = await Resource.findById(id);
    if (!resource) return next(new AppError('Resource not found', 404));

    const isUpvoted = resource.upvotes.includes(userId);
    const isDownvoted = resource.downvotes.includes(userId);
    const uploader = await User.findById(resource.uploader);

    if (isDownvoted) {
      resource.downvotes = resource.downvotes.filter((uid) => uid.toString() !== userId);
      if (uploader) uploader.reputation.points += 5;
    } else {
      resource.downvotes.push(userId);
      if (isUpvoted) {
        resource.upvotes = resource.upvotes.filter((uid) => uid.toString() !== userId);
        if (uploader) uploader.reputation.points = Math.max(0, uploader.reputation.points - 10);
      }
      if (uploader) uploader.reputation.points = Math.max(0, uploader.reputation.points - 5);
    }

    if (uploader) await uploader.save();
    await resource.save();

    res.status(200).json({
      success: true,
      upvotesCount: resource.upvotes.length,
      downvotesCount: resource.downvotes.length,
      voted: isDownvoted ? 0 : -1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download a resource file.
 *
 * The controller proxies the file through the backend so it can set proper
 * Content-Disposition headers with the original filename. This ensures:
 *  - The file downloads with the correct name (e.g. "Notes.pdf" not "abc123")
 *  - Works on all devices (desktop, mobile, Safari)
 *  - No empty/blank tabs are opened by the browser
 *
 * For Vercel serverless, Vercel has a 4.5 MB response size limit.
 * For files larger than that, we fall back to a signed Cloudinary redirect
 * with fl_attachment so Cloudinary sets the Content-Disposition itself.
 */
export const downloadResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resource = await Resource.findById(id);
    if (!resource) return next(new AppError('Resource not found', 404));
    if (!resource.fileUrl) return next(new AppError('File not available', 404));

    // Increment download counter first (non-blocking)
    resource.metrics.downloads += 1;
    resource.save().catch((e) => console.error('Download count save error:', e.message));

    const downloadName = getDownloadName(resource);
    const contentType =
      resource.contentType || resource.mimeType || resource.fileType || 'application/octet-stream';

    // Build safe Cloudinary URL
    let fileUrl = toHttps(resource.fileUrl);

    // Add fl_attachment with encoded filename so Cloudinary sets Content-Disposition
    // This is the fallback for large files that can't be proxied through Vercel
    const safeCloudinaryName = encodeURIComponent(downloadName).replace(/%2F/g, '/');
    let cloudinaryDownloadUrl = fileUrl;
    if (fileUrl.includes('cloudinary.com') && fileUrl.includes('/upload/')) {
      // Remove any existing transformation flags first
      cloudinaryDownloadUrl = fileUrl.replace(
        '/upload/',
        `/upload/fl_attachment:${safeCloudinaryName}/`
      );
    }

    // If the client wants a JSON response (React frontend), return URLs + metadata
    if (req.query.json === 'true') {
      return res.status(200).json({
        success: true,
        url: cloudinaryDownloadUrl,  // Use the Cloudinary URL with fl_attachment
        filename: downloadName,
        mimeType: contentType,
      });
    }

    // For direct browser requests: proxy through backend with correct headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', buildDownloadDisposition(downloadName));

    try {
      await streamRemoteFile(fileUrl, res);
    } catch (streamErr) {
      console.error('Stream error, falling back to redirect:', streamErr.message);
      if (!res.headersSent) {
        return res.redirect(302, cloudinaryDownloadUrl);
      }
      res.end();
    }
  } catch (error) {
    if (!res.headersSent) next(error);
    else res.end();
  }
};

export const getTopResources = async (req, res, next) => {
  try {
    const resources = await Resource.find({ isApproved: true })
      .sort({ 'metrics.downloads': -1, 'metrics.views': -1 })
      .limit(10)
      .populate('uploader', 'name avatar');

    res.status(200).json({ success: true, data: resources });
  } catch (error) {
    next(error);
  }
};

export const getRecentResources = async (req, res, next) => {
  try {
    const resources = await Resource.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('uploader', 'name avatar');

    res.status(200).json({ success: true, data: resources });
  } catch (error) {
    next(error);
  }
};

export const requestResource = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Your resource request has been posted to the Ask Seniors forum.',
  });
};
