import User from '../models/User.js';
import Resource from '../models/Resource.js';
import Forum from '../models/Forum.js';
import Event from '../models/Event.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createNotification } from '../services/notification.service.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalResources = await Resource.countDocuments({ isApproved: true });
    const pendingResources = await Resource.countDocuments({ isApproved: false });
    const totalDiscussions = await Forum.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalResources,
        pendingResources,
        totalDiscussions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['student', 'senior', 'moderator', 'admin'].includes(role)) {
      return next(new AppError('Invalid role type', 400));
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user) return next(new AppError('User not found', 404));

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return next(new AppError('User not found', 404));

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingResources = async (req, res, next) => {
  try {
    const resources = await Resource.find({ isApproved: false })
      .populate('uploader', 'name avatar email');

    res.status(200).json({
      success: true,
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};

export const approveResource = async (req, res, next) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findById(id);
    if (!resource) return next(new AppError('Resource not found', 404));

    resource.isApproved = true;
    await resource.save();

    // Reward uploader
    const uploader = await User.findById(resource.uploader);
    if (uploader) {
      uploader.reputation.points += 20; // 20 points for an approved resource
      await uploader.save();

      await createNotification({
        recipient: uploader._id,
        sender: req.user.id,
        type: 'resource-approved',
        message: `Your resource "${resource.title}" has been approved! Earned 20 reputation points.`,
        link: `/resources/${resource.slug}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Resource approved successfully',
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectResource = async (req, res, next) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findById(id);
    if (!resource) return next(new AppError('Resource not found', 404));

    // Notify uploader first
    await createNotification({
      recipient: resource.uploader,
      sender: req.user.id,
      type: 'system',
      message: `Your resource submission "${resource.title}" was rejected as it does not meet guidelines.`,
      link: '#',
    });

    await Resource.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Resource rejected and deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req, res, next) => {
  try {
    // Return mock trends or aggregation results for dashboard graphs
    res.status(200).json({
      success: true,
      data: {
        resourceUploadsByMonth: [12, 19, 3, 5, 2, 3, 20, 30, 45, 60, 42, 50],
        registrationsByMonth: [100, 120, 80, 70, 60, 90, 200, 300, 450, 500, 410, 480],
      },
    });
  } catch (error) {
    next(error);
  }
};
