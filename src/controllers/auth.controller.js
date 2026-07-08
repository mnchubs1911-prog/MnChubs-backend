import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { generateToken, generateRandomToken } from '../utils/helpers.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/email.service.js';
import { AppError } from '../middlewares/errorHandler.js';
import { verifyFirebaseToken } from '../config/firebase-admin.js';

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Set refreshToken cookie
  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Lax' : 'Lax',
    path: '/',
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
      profile: user.profile,
      reputation: user.reputation,
      lastActiveAt: user.lastActiveAt,
    },
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError('User already exists with this email', 400));
    }

    const verificationToken = generateRandomToken();

    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
      profile: {
        phone,
      },
    });

    await sendVerificationEmail(user, verificationToken);

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid credentials', 401));
    }

    user.lastActiveAt = new Date();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { idToken, phone } = req.body;

    if (!idToken) {
      return next(new AppError('Google sign-in token is required', 400));
    }

    const decodedToken = await verifyFirebaseToken(idToken);
    const email = decodedToken.email;
    const name = decodedToken.name || decodedToken.email?.split('@')[0] || 'Google User';
    const googleId = decodedToken.uid;
    const avatar = decodedToken.picture || '';

    if (!email) {
      return next(new AppError('Google account email is required', 400));
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        avatar,
        isVerified: true, // Google accounts are verified
        profile: {
          phone,
        },
        lastActiveAt: new Date(),
      });
      await sendWelcomeEmail(user);
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
        user.isVerified = true;
        if (avatar && !user.avatar) user.avatar = avatar;
      }

      if (phone && !user.profile?.phone) {
        user.profile = {
          ...user.profile?.toObject?.(),
          phone,
        };
      }

      user.lastActiveAt = new Date();
      await user.save();
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return next(new AppError('Invalid or expired verification token', 400));
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    await sendWelcomeEmail(user);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now access all features.',
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('There is no user with that email', 404));
    }

    const resetToken = generateRandomToken();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const success = await sendPasswordResetEmail(user, resetToken);

    if (!success) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return next(new AppError('Email could not be sent. Try again later.', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email address',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError('Invalid or expired password reset token', 400));
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return next(new AppError('Refresh token not found, please login', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError('User not found', 401));
    }

    const newAccessToken = user.generateAuthToken();

    res.status(200).json({
      success: true,
      token: newAccessToken,
    });
  } catch (error) {
    next(new AppError('Refresh token verification failed, please login again', 401));
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken');
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
