import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const markUserActive = (user) => {
  if (!user) return;

  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;
  const lastActiveAt = user.lastActiveAt ? new Date(user.lastActiveAt) : null;

  if (!lastActiveAt || now - lastActiveAt > fiveMinutes) {
    user.lastActiveAt = now;
    User.updateOne({ _id: user._id }, { lastActiveAt: now }).catch((error) => {
      console.error('Failed to update user activity', error);
    });
  }
};

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found with this token',
        });
      }

      markUserActive(req.user);
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token verification failed, not authorized',
      });
    }
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        markUserActive(req.user);
      } catch (err) {
        // Silent fail
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};
