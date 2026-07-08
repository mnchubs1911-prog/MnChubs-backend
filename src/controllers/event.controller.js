import Event from '../models/Event.js';
import { AppError } from '../middlewares/errorHandler.js';

export const createEvent = async (req, res, next) => {
  try {
    const { title, description, type, date, endDate, branch, semester, isImportant } = req.body;

    let attachments = [];
    if (req.file) {
      attachments.push({
        url: req.file.path,
        name: req.file.originalname,
      });
    }

    const event = await Event.create({
      title,
      description,
      type,
      date,
      endDate,
      branch,
      semester,
      isImportant: isImportant === 'true' || isImportant === true,
      attachments,
      postedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

export const getEvents = async (req, res, next) => {
  try {
    const { type, branch, semester } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (branch) filter.branch = branch;
    if (semester) filter.semester = parseInt(semester, 10);

    const events = await Event.find(filter).sort({ date: 1 });

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

export const getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return next(new AppError('Notice/Event not found', 404));

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return next(new AppError('Notice/Event not found', 404));

    if (event.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    if (req.file) {
      req.body.attachments = [{
        url: req.file.path,
        name: req.file.originalname,
      }];
    }

    if (req.body.isImportant !== undefined) {
      req.body.isImportant = req.body.isImportant === 'true' || req.body.isImportant === true;
    }

    Object.assign(event, req.body);
    await event.save();

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return next(new AppError('Notice/Event not found', 404));

    if (event.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    await Event.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Notice/Event deleted' });
  } catch (error) {
    next(error);
  }
};

export const getUpcoming = async (req, res, next) => {
  try {
    const events = await Event.find({ date: { $gte: new Date() } })
      .sort({ date: 1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};
