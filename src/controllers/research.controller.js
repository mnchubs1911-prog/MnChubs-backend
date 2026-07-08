import Research from '../models/Research.js';
import { AppError } from '../middlewares/errorHandler.js';
import { paginateResults } from '../utils/helpers.js';

export const createProject = async (req, res, next) => {
  try {
    const { title, description, type, difficulty, category, githubUrl, liveUrl, paperUrl, techStack, requiredSkills, isOpen } = req.body;

    const project = await Research.create({
      title,
      description,
      type,
      difficulty,
      category: category ? (Array.isArray(category) ? category : category.split(',')) : [],
      githubUrl,
      liveUrl,
      paperUrl,
      techStack: techStack ? (Array.isArray(techStack) ? techStack : techStack.split(',')) : [],
      requiredSkills: requiredSkills ? (Array.isArray(requiredSkills) ? requiredSkills : requiredSkills.split(',')) : [],
      isOpen: isOpen !== undefined ? isOpen : true,
      author: req.user.id,
      teamMembers: [{ user: req.user.id, role: 'Owner' }],
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const { type, difficulty, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { techStack: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const { skip, limit: limitNum, page: pageNum } = paginateResults(page, limit);

    const projects = await Research.find(filter)
      .populate('author', 'name avatar')
      .populate('teamMembers.user', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Research.countDocuments(filter);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        pages: Math.ceil(total / limitNum),
        page: pageNum,
        limit: limitNum,
      },
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

export const getProject = async (req, res, next) => {
  try {
    const project = await Research.findById(req.params.id)
      .populate('author', 'name avatar')
      .populate('teamMembers.user', 'name avatar');

    if (!project) {
      return next(new AppError('Project or research opportunity not found', 404));
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await Research.findById(req.params.id);
    if (!project) return next(new AppError('Project not found', 404));

    if (project.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    Object.assign(project, req.body);
    await project.save();

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const project = await Research.findById(req.params.id);
    if (!project) return next(new AppError('Project not found', 404));

    if (project.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    await Research.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
};

export const joinCollaboration = async (req, res, next) => {
  try {
    const project = await Research.findById(req.params.id);
    if (!project) return next(new AppError('Project not found', 404));

    if (!project.isOpen) {
      return next(new AppError('This project is closed for collaboration', 400));
    }

    const alreadyJoined = project.teamMembers.some(
      member => member.user.toString() === req.user.id
    );

    if (alreadyJoined) {
      return next(new AppError('You are already a team member', 400));
    }

    project.teamMembers.push({
      user: req.user.id,
      role: 'Collaborator',
    });

    await project.save();

    res.status(200).json({
      success: true,
      message: 'Successfully joined collaboration',
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const leaveCollaboration = async (req, res, next) => {
  try {
    const project = await Research.findById(req.params.id);
    if (!project) return next(new AppError('Project not found', 404));

    if (project.author.toString() === req.user.id) {
      return next(new AppError('Owner cannot leave the project', 400));
    }

    project.teamMembers = project.teamMembers.filter(
      member => member.user.toString() !== req.user.id
    );

    await project.save();

    res.status(200).json({
      success: true,
      message: 'Successfully left the project team',
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectIdeas = async (req, res, next) => {
  req.query.type = 'idea';
  return getProjects(req, res, next);
};
