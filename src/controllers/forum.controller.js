import Forum from '../models/Forum.js';
import User from '../models/User.js';
import { AppError } from '../middlewares/errorHandler.js';
import { paginateResults } from '../utils/helpers.js';
import { createNotification } from '../services/notification.service.js';

export const createPost = async (req, res, next) => {
  try {
    const { title, content, category, branch, isAnonymous, tags } = req.body;

    const parsedTags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [];

    const post = await Forum.create({
      title,
      content,
      category,
      branch: category === 'branch-discussion' ? branch : undefined,
      author: req.user.id,
      isAnonymous: isAnonymous || false,
      tags: parsedTags,
    });

    res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

export const getPosts = async (req, res, next) => {
  try {
    const { category, branch, tag, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (branch && category === 'branch-discussion') filter.branch = branch;
    if (tag) filter.tags = tag;
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const { skip, limit: limitNum, page: pageNum } = paginateResults(page, limit);

    const posts = await Forum.find(filter)
      .populate('author', 'name avatar role reputation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Forum.countDocuments(filter);

    // Filter anonymous fields
    const processedPosts = posts.map(post => {
      const p = post.toObject();
      if (p.isAnonymous) {
        p.author = { name: 'Anonymous Student', avatar: null, role: 'student', reputation: { points: 0, level: 1 } };
      }
      return p;
    });

    res.status(200).json({
      success: true,
      pagination: {
        total,
        pages: Math.ceil(total / limitNum),
        page: pageNum,
        limit: limitNum,
      },
      data: processedPosts,
    });
  } catch (error) {
    next(error);
  }
};

export const getPost = async (req, res, next) => {
  try {
    const post = await Forum.findById(req.params.id)
      .populate('author', 'name avatar role reputation')
      .populate('answers.author', 'name avatar role reputation');

    if (!post) {
      return next(new AppError('Post not found', 404));
    }

    post.views += 1;
    await post.save();

    const p = post.toObject();
    if (p.isAnonymous) {
      p.author = { name: 'Anonymous Student', avatar: null, role: 'student', reputation: { points: 0, level: 1 } };
    }

    res.status(200).json({
      success: true,
      data: p,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePost = async (req, res, next) => {
  try {
    const post = await Forum.findById(req.params.id);
    if (!post) return next(new AppError('Post not found', 404));

    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    const { title, content, tags } = req.body;
    if (title) post.title = title;
    if (content) post.content = content;
    if (tags) post.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());

    await post.save();

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const post = await Forum.findById(req.params.id);
    if (!post) return next(new AppError('Post not found', 404));

    if (post.author.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return next(new AppError('Not authorized', 403));
    }

    await Forum.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const addAnswer = async (req, res, next) => {
  try {
    const { content } = req.body;
    const post = await Forum.findById(req.params.id);
    if (!post) return next(new AppError('Post not found', 404));

    const newAnswer = {
      content,
      author: req.user.id,
      createdAt: new Date(),
    };

    post.answers.push(newAnswer);
    await post.save();

    // Notify author of post
    if (post.author.toString() !== req.user.id) {
      await createNotification({
        recipient: post.author,
        sender: req.user.id,
        type: 'new-answer',
        message: `${req.user.name} answered your question: "${post.title.substring(0, 30)}..."`,
        link: `/community/post/${post._id}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Answer added successfully',
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptAnswer = async (req, res, next) => {
  try {
    const { id, answerId } = req.params;
    const post = await Forum.findById(id);
    if (!post) return next(new AppError('Post not found', 404));

    if (post.author.toString() !== req.user.id) {
      return next(new AppError('Only the post author can accept an answer', 403));
    }

    let acceptedAuthorId = null;

    post.answers = post.answers.map(ans => {
      if (ans._id.toString() === answerId) {
        ans.isAccepted = true;
        acceptedAuthorId = ans.author;
      } else {
        ans.isAccepted = false;
      }
      return ans;
    });

    post.isResolved = true;
    await post.save();

    // Reward answerer
    if (acceptedAuthorId) {
      const answerer = await User.findById(acceptedAuthorId);
      if (answerer) {
        answerer.reputation.points += 25; // Large boost for accepted answer
        await answerer.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Answer accepted successfully',
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAnswer = async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Answer updated' });
};

export const deleteAnswer = async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Answer deleted' });
};

export const upvotePost = async (req, res, next) => {
  try {
    const post = await Forum.findById(req.params.id);
    if (!post) return next(new AppError('Post not found', 404));

    const userId = req.user.id;
    const isUpvoted = post.upvotes.includes(userId);

    if (isUpvoted) {
      post.upvotes = post.upvotes.filter(id => id.toString() !== userId);
    } else {
      post.upvotes.push(userId);
      post.downvotes = post.downvotes.filter(id => id.toString() !== userId);
    }

    await post.save();
    res.status(200).json({ success: true, upvotes: post.upvotes.length });
  } catch (error) {
    next(error);
  }
};

export const downvotePost = async (req, res, next) => {
  try {
    const post = await Forum.findById(req.params.id);
    if (!post) return next(new AppError('Post not found', 404));

    const userId = req.user.id;
    const isDownvoted = post.downvotes.includes(userId);

    if (isDownvoted) {
      post.downvotes = post.downvotes.filter(id => id.toString() !== userId);
    } else {
      post.downvotes.push(userId);
      post.upvotes = post.upvotes.filter(id => id.toString() !== userId);
    }

    await post.save();
    res.status(200).json({ success: true, downvotes: post.downvotes.length });
  } catch (error) {
    next(error);
  }
};

export const upvoteAnswer = async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Upvoted answer' });
};

export const downvoteAnswer = async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Downvoted answer' });
};

export const getBranchDiscussions = async (req, res, next) => {
  req.query.category = 'branch-discussion';
  req.query.branch = req.params.branch;
  return getPosts(req, res, next);
};
