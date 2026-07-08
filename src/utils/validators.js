import { body } from 'express-validator';

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^\+?[0-9\s()-]{7,20}$/)
    .withMessage('Please provide a valid mobile number'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const resourceValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('resourceType')
    .isIn(['notes', 'pyq', 'mid-sem', 'end-sem', 'assignment', 'lab-file', 'reference-book', 'youtube-playlist', 'survival-kit', 'question-bank'])
    .withMessage('Invalid resource type'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
  body('branch').isIn(['MnC']).withMessage('Invalid branch'),
  body('subject').trim().notEmpty().withMessage('Subject name or ID is required'),
];

export const forumPostValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('category')
    .isIn(['ask-seniors', 'branch-discussion', 'general', 'doubt', 'resource-request'])
    .withMessage('Invalid category'),
];
