import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateToken = (payload, secret, expiresIn) => {
  return jwt.sign(payload, secret, { expiresIn });
};

export const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const paginateResults = (page = 1, limit = 10) => {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;
  return { skip, limit: limitNum, page: pageNum };
};

export const formatResponse = (success, message, data = null) => {
  return {
    success,
    message,
    ...(data && { data }),
  };
};
