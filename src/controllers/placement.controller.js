import Placement from '../models/Placement.js';
import { AppError } from '../middlewares/errorHandler.js';
import { paginateResults } from '../utils/helpers.js';

export const createExperience = async (req, res, next) => {
  try {
    const { companyName, role, type, experience, rounds, stipend, duration, selectionProcess, verdict, tips, tags, year } = req.body;

    const parsedTags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [];

    const placement = await Placement.create({
      companyName,
      role,
      type,
      experience,
      rounds: rounds || [],
      stipend,
      duration,
      selectionProcess,
      verdict,
      tips,
      tags: parsedTags,
      year: year || new Date().getFullYear(),
      author: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: placement,
    });
  } catch (error) {
    next(error);
  }
};

export const getExperiences = async (req, res, next) => {
  try {
    const { company, role, type, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (company) filter.companyName = { $regex: company, $options: 'i' };
    if (role) filter.role = { $regex: role, $options: 'i' };
    if (type) filter.type = type;

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { experience: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const { skip, limit: limitNum, page: pageNum } = paginateResults(page, limit);

    const experiences = await Placement.find(filter)
      .populate('author', 'name avatar profile.branch')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Placement.countDocuments(filter);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        pages: Math.ceil(total / limitNum),
        page: pageNum,
        limit: limitNum,
      },
      data: experiences,
    });
  } catch (error) {
    next(error);
  }
};

export const getExperience = async (req, res, next) => {
  try {
    const experience = await Placement.findById(req.params.id)
      .populate('author', 'name avatar profile.branch');

    if (!experience) {
      return next(new AppError('Placement experience not found', 404));
    }

    res.status(200).json({
      success: true,
      data: experience,
    });
  } catch (error) {
    next(error);
  }
};

export const updateExperience = async (req, res, next) => {
  try {
    const exp = await Placement.findById(req.params.id);
    if (!exp) return next(new AppError('Experience not found', 404));

    if (exp.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    Object.assign(exp, req.body);
    await exp.save();

    res.status(200).json({ success: true, data: exp });
  } catch (error) {
    next(error);
  }
};

export const deleteExperience = async (req, res, next) => {
  try {
    const exp = await Placement.findById(req.params.id);
    if (!exp) return next(new AppError('Experience not found', 404));

    if (exp.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    await Placement.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Experience deleted' });
  } catch (error) {
    next(error);
  }
};

export const upvote = async (req, res, next) => {
  try {
    const exp = await Placement.findById(req.params.id);
    if (!exp) return next(new AppError('Experience not found', 404));

    const userId = req.user.id;
    if (exp.upvotes.includes(userId)) {
      exp.upvotes = exp.upvotes.filter(id => id.toString() !== userId);
    } else {
      exp.upvotes.push(userId);
      exp.downvotes = exp.downvotes.filter(id => id.toString() !== userId);
    }

    await exp.save();
    res.status(200).json({ success: true, upvotes: exp.upvotes.length });
  } catch (error) {
    next(error);
  }
};

export const downvote = async (req, res, next) => {
  try {
    const exp = await Placement.findById(req.params.id);
    if (!exp) return next(new AppError('Experience not found', 404));

    const userId = req.user.id;
    if (exp.downvotes.includes(userId)) {
      exp.downvotes = exp.downvotes.filter(id => id.toString() !== userId);
    } else {
      exp.downvotes.push(userId);
      exp.upvotes = exp.upvotes.filter(id => id.toString() !== userId);
    }

    await exp.save();
    res.status(200).json({ success: true, downvotes: exp.downvotes.length });
  } catch (error) {
    next(error);
  }
};

export const getCompanyWise = async (req, res, next) => {
  try {
    const company = req.params.company;
    const experiences = await Placement.find({ companyName: { $regex: new RegExp(`^${company}$`, 'i') } })
      .populate('author', 'name avatar');
    
    res.status(200).json({
      success: true,
      data: experiences,
    });
  } catch (error) {
    next(error);
  }
};
