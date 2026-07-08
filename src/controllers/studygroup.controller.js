import StudyGroup from '../models/StudyGroup.js';
import Chat from '../models/Chat.js';
import { AppError } from '../middlewares/errorHandler.js';

export const createGroup = async (req, res, next) => {
  try {
    const { name, description, subject, branch, semester, maxMembers, isPublic } = req.body;

    // First create a group chat room
    const chat = await Chat.create({
      type: 'group',
      groupName: `${name} Chat`,
      participants: [req.user.id],
      groupAdmin: req.user.id,
    });

    const studyGroup = await StudyGroup.create({
      name,
      description,
      subject,
      branch,
      semester: parseInt(semester, 10),
      admin: req.user.id,
      members: [{ user: req.user.id, joinedAt: new Date() }],
      maxMembers: parseInt(maxMembers, 10) || 20,
      isPublic: isPublic !== undefined ? isPublic : true,
      chat: chat._id,
    });

    res.status(201).json({
      success: true,
      data: studyGroup,
    });
  } catch (error) {
    next(error);
  }
};

export const getGroups = async (req, res, next) => {
  try {
    const { branch, semester, search } = req.query;
    const filter = { isPublic: true };

    if (branch) filter.branch = branch;
    if (semester) filter.semester = parseInt(semester, 10);
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const groups = await StudyGroup.find(filter)
      .populate('admin', 'name avatar')
      .populate('members.user', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
};

export const getGroup = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id)
      .populate('admin', 'name avatar')
      .populate('members.user', 'name avatar')
      .populate('resources', 'title fileUrl fileType uploader');

    if (!group) return next(new AppError('Study group not found', 404));

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

export const joinGroup = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return next(new AppError('Study group not found', 404));

    if (group.members.some(m => m.user.toString() === req.user.id)) {
      return next(new AppError('Already a member of this group', 400));
    }

    if (group.members.length >= group.maxMembers) {
      return next(new AppError('Group is full', 400));
    }

    group.members.push({ user: req.user.id, joinedAt: new Date() });
    await group.save();

    // Add user to the associated group chat
    const chat = await Chat.findById(group.chat);
    if (chat && !chat.participants.includes(req.user.id)) {
      chat.participants.push(req.user.id);
      await chat.save();
    }

    res.status(200).json({
      success: true,
      message: 'Successfully joined study group',
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

export const leaveGroup = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return next(new AppError('Study group not found', 404));

    if (group.admin.toString() === req.user.id) {
      return next(new AppError('Group admin cannot leave the group. Delete or transfer ownership instead.', 400));
    }

    group.members = group.members.filter(m => m.user.toString() !== req.user.id);
    await group.save();

    // Remove user from group chat participants
    const chat = await Chat.findById(group.chat);
    if (chat) {
      chat.participants = chat.participants.filter(id => id.toString() !== req.user.id);
      await chat.save();
    }

    res.status(200).json({
      success: true,
      message: 'Successfully left study group',
    });
  } catch (error) {
    next(error);
  }
};

export const addResource = async (req, res, next) => {
  try {
    const { resourceId } = req.body;
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return next(new AppError('Study group not found', 404));

    if (!group.members.some(m => m.user.toString() === req.user.id)) {
      return next(new AppError('Must be a member to share resources', 403));
    }

    if (group.resources.includes(resourceId)) {
      return next(new AppError('Resource already shared in this group', 400));
    }

    group.resources.push(resourceId);
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Resource shared in study group successfully',
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

export const removeResource = async (req, res, next) => {
  try {
    const { resourceId } = req.params;
    const group = await StudyGroup.findById(req.params.id);
    if (!group) return next(new AppError('Study group not found', 404));

    group.resources = group.resources.filter(id => id.toString() !== resourceId);
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Resource removed from study group',
    });
  } catch (error) {
    next(error);
  }
};

export const getMyGroups = async (req, res, next) => {
  try {
    const groups = await StudyGroup.find({ 'members.user': req.user.id })
      .populate('admin', 'name avatar')
      .populate('members.user', 'name avatar');

    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
};
