import User from '../models/User.js';
import Resource from '../models/Resource.js';
import Research from '../models/Research.js';

export const getPlatformStats = async (req, res, next) => {
  try {
    const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      resourcesUploaded,
      activeStudents,
      seniorMentors,
      projectsShowcased,
    ] = await Promise.all([
      Resource.countDocuments({ isApproved: true }),
      User.countDocuments({
        role: { $in: ['student', 'senior'] },
        lastActiveAt: { $gte: activeSince },
      }),
      User.countDocuments({ role: 'senior' }),
      Research.countDocuments({ type: 'project' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        resourcesUploaded,
        activeStudents,
        seniorMentors,
        projectsShowcased,
        activeWindowDays: 30,
      },
    });
  } catch (error) {
    next(error);
  }
};
