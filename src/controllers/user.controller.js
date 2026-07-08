import User from '../models/User.js';
import Resource from '../models/Resource.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('bookmarks', 'title resourceType fileType')
      .populate('connections', 'name avatar profile.branch');
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { branch, semester, bio, skills, resume, linkedin, github, phone, name } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (name) user.name = name;
    
    user.profile = {
      ...user.profile,
      branch: branch || user.profile.branch,
      semester: semester || user.profile.semester,
      bio: bio !== undefined ? bio : user.profile.bio,
      skills: skills || user.profile.skills,
      resume: resume !== undefined ? resume : user.profile.resume,
      linkedin: linkedin !== undefined ? linkedin : user.profile.linkedin,
      github: github !== undefined ? github : user.profile.github,
      phone: phone !== undefined ? phone : user.profile.phone,
    };

    await user.save();

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload an avatar image file', 400));
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: req.file.path },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookmarks = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'bookmarks',
      populate: { path: 'uploader', select: 'name avatar' },
    });

    res.status(200).json({
      success: true,
      data: user.bookmarks,
    });
  } catch (error) {
    next(error);
  }
};

export const addBookmark = async (req, res, next) => {
  try {
    const { resourceId } = req.params;

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return next(new AppError('Resource not found', 404));
    }

    const user = await User.findById(req.user.id);
    if (user.bookmarks.includes(resourceId)) {
      return res.status(200).json({ success: true, message: 'Resource already bookmarked' });
    }

    user.bookmarks.push(resourceId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Resource bookmarked successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const removeBookmark = async (req, res, next) => {
  try {
    const { resourceId } = req.params;

    const user = await User.findById(req.user.id);
    user.bookmarks = user.bookmarks.filter(id => id.toString() !== resourceId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Resource removed from bookmarks',
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentlyViewed = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'recentlyViewed.resource',
      populate: { path: 'uploader', select: 'name avatar' },
    });

    res.status(200).json({
      success: true,
      data: user.recentlyViewed,
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaderboard = async (req, res, next) => {
  try {
    const leaderboard = await User.find({ isVerified: true })
      .sort({ 'reputation.points': -1 })
      .limit(50)
      .select('name avatar role profile.branch reputation');

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const { q, branch, role } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { 'profile.skills': { $regex: q, $options: 'i' } },
      ];
    }

    if (branch) {
      filter['profile.branch'] = branch;
    }

    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .limit(20)
      .select('name avatar role profile.branch profile.skills reputation');

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const sendConnectRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user.id) {
      return next(new AppError('You cannot connect with yourself', 400));
    }

    const userToConnect = await User.findById(userId);
    if (!userToConnect) {
      return next(new AppError('User not found', 404));
    }

    const currentUser = await User.findById(req.user.id);
    if (currentUser.connections.includes(userId)) {
      return next(new AppError('Already connected', 400));
    }

    // Since this is a simple connect mechanism (or request/accept), let's just create an immediate connection for now,
    // or simulate request. Let's do instant connect for simplicity and flow.
    currentUser.connections.push(userId);
    userToConnect.connections.push(req.user.id);
    
    await currentUser.save();
    await userToConnect.save();

    res.status(200).json({
      success: true,
      message: `Successfully connected with ${userToConnect.name}`,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptConnect = async (req, res, next) => {
  // Direct connect implementation makes this route redundant, but we supply it for front-end compatibility
  res.status(200).json({ success: true, message: 'Request accepted' });
};
