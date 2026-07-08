import Mentorship from '../models/Mentorship.js';
import User from '../models/User.js';
import { AppError } from '../middlewares/errorHandler.js';

export const registerAsMentor = async (req, res, next) => {
  try {
    // Users with role 'senior' can offer mentorship. Promote role or mark custom field
    const user = await User.findById(req.user.id);
    if (user.role === 'student') {
      user.role = 'senior'; // Promote
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'You have registered as a mentor successfully!',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const findMentors = async (req, res, next) => {
  try {
    const { branch, skill } = req.query;
    const filter = { role: 'senior' };

    if (branch) filter['profile.branch'] = branch;
    if (skill) filter['profile.skills'] = { $regex: skill, $options: 'i' };

    const mentors = await User.find(filter).select('name avatar profile reputation');

    res.status(200).json({
      success: true,
      data: mentors,
    });
  } catch (error) {
    next(error);
  }
};

export const requestMentorship = async (req, res, next) => {
  try {
    const { mentorId, subject, description } = req.body;

    if (mentorId === req.user.id) {
      return next(new AppError('You cannot request mentorship from yourself', 400));
    }

    const mentorship = await Mentorship.create({
      mentor: mentorId,
      mentee: req.user.id,
      subject,
      description,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Mentorship request sent successfully',
      data: mentorship,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptMentorship = async (req, res, next) => {
  try {
    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) return next(new AppError('Mentorship session not found', 404));

    if (mentorship.mentor.toString() !== req.user.id) {
      return next(new AppError('Not authorized to accept this request', 403));
    }

    mentorship.status = 'active';
    await mentorship.save();

    res.status(200).json({
      success: true,
      message: 'Mentorship request accepted',
      data: mentorship,
    });
  } catch (error) {
    next(error);
  }
};

export const completeMentorship = async (req, res, next) => {
  try {
    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) return next(new AppError('Mentorship not found', 404));

    mentorship.status = 'completed';
    await mentorship.save();

    res.status(200).json({ success: true, message: 'Mentorship completed' });
  } catch (error) {
    next(error);
  }
};

export const addSession = async (req, res, next) => {
  try {
    const { date, duration, notes } = req.body;
    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) return next(new AppError('Mentorship session not found', 404));

    mentorship.sessions.push({ date, duration, notes });
    await mentorship.save();

    res.status(200).json({
      success: true,
      data: mentorship,
    });
  } catch (error) {
    next(error);
  }
};

export const addFeedback = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) return next(new AppError('Mentorship not found', 404));

    if (mentorship.sessions.length === 0) {
      return next(new AppError('No sessions found to leave feedback on', 400));
    }

    const lastSession = mentorship.sessions[mentorship.sessions.length - 1];
    lastSession.feedback = { rating, comment };

    await mentorship.save();

    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: mentorship,
    });
  } catch (error) {
    next(error);
  }
};
