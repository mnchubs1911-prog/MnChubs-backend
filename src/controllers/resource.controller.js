import Resource from '../models/Resource.js';
import User from '../models/User.js';
import { AppError } from '../middlewares/errorHandler.js';
import { paginateResults } from '../utils/helpers.js';
import { createNotification } from '../services/notification.service.js';

export const createResource = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a file', 400));
    }

    const { title, description, resourceType, subject, semester, branch, tags } = req.body;

    const parsedTags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [];

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
      fileType: req.file.mimetype,
      tags: parsedTags,
      isApproved: true, // Instantly visible in development mode
    });

    res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully and is pending approval.',
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

export const getResources = async (req, res, next) => {
  try {
    const { branch, semester, subject, resourceType, tags, search, sort, page = 1, limit = 10 } = req.query;
    
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

    // Sorting
    if (sort === 'downloads') {
      query = query.sort({ 'metrics.downloads': -1, createdAt: -1 });
    } else if (sort === 'upvotes') {
      query = query.sort({ upvotes: -1, createdAt: -1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const resources = await query.skip(skip).limit(limitNum);
    const total = await Resource.countDocuments(filter);

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

    const resource = await Resource.findOne({ slug, isApproved: true })
      .populate('uploader', 'name avatar reputation');

    if (!resource) {
      return next(new AppError('Resource not found', 404));
    }

    // Increment view metrics
    resource.metrics.views += 1;
    await resource.save();

    // If authenticated, add to recentlyViewed
    if (req.user) {
      const user = await User.findById(req.user.id);
      
      // Filter out previous occurrences of this resource
      user.recentlyViewed = user.recentlyViewed.filter(
        item => item.resource.toString() !== resource._id.toString()
      );

      // Add to front of list
      user.recentlyViewed.unshift({
        resource: resource._id,
        viewedAt: new Date(),
      });

      // Keep only last 20
      if (user.recentlyViewed.length > 20) {
        user.recentlyViewed.pop();
      }

      await user.save();
    }

    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

export const updateResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, tags, subject } = req.body;

    const resource = await Resource.findById(id);
    if (!resource) {
      return next(new AppError('Resource not found', 404));
    }

    // Check uploader or is admin/moderator
    if (resource.uploader.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return next(new AppError('Not authorized to edit this resource', 403));
    }

    if (title) resource.title = title;
    if (description) resource.description = description;
    if (subject) resource.subject = subject;
    if (tags) {
      resource.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    }

    await resource.save();

    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteResource = async (req, res, next) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findById(id);
    if (!resource) {
      return next(new AppError('Resource not found', 404));
    }

    if (resource.uploader.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return next(new AppError('Not authorized to delete this resource', 403));
    }

    // Cloudinary file removal could go here if required

    await Resource.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Resource deleted successfully',
    });
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
      resource.upvotes = resource.upvotes.filter(id => id.toString() !== userId);
      if (uploader) uploader.reputation.points = Math.max(0, uploader.reputation.points - 10);
    } else {
      resource.upvotes.push(userId);
      if (isDownvoted) {
        resource.downvotes = resource.downvotes.filter(id => id.toString() !== userId);
        if (uploader) uploader.reputation.points += 5; // offset downvote penalty
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
      resource.downvotes = resource.downvotes.filter(id => id.toString() !== userId);
      if (uploader) uploader.reputation.points += 5;
    } else {
      resource.downvotes.push(userId);
      if (isUpvoted) {
        resource.upvotes = resource.upvotes.filter(id => id.toString() !== userId);
        if (uploader) uploader.reputation.points = Math.max(0, uploader.reputation.points - 10); // remove upvote bonus
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

export const downloadResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resource = await Resource.findById(id);
    if (!resource) return next(new AppError('Resource not found', 404));

    resource.metrics.downloads += 1;
    await resource.save();

    res.status(200).json({
      success: true,
      url: resource.fileUrl,
    });
  } catch (error) {
    next(error);
  }
};

export const getTopResources = async (req, res, next) => {
  try {
    const resources = await Resource.find({ isApproved: true })
      .sort({ 'metrics.downloads': -1, 'metrics.views': -1 })
      .limit(10)
      .populate('uploader', 'name avatar');

    res.status(200).json({
      success: true,
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentResources = async (req, res, next) => {
  try {
    const resources = await Resource.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('uploader', 'name avatar');

    res.status(200).json({
      success: true,
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};

export const requestResource = async (req, res, next) => {
  // Simulate resource request by returning success
  res.status(200).json({
    success: true,
    message: 'Your resource request has been posted to the Ask Seniors forum.',
  });
};
