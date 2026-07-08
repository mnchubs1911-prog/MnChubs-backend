import Chat from '../models/Chat.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getConversations = async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .populate('participants', 'name avatar role')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: chats,
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const chat = await Chat.findById(id)
      .populate('messages.sender', 'name avatar')
      .exec();

    if (!chat) return next(new AppError('Chat not found', 404));

    if (!chat.participants.includes(req.user.id)) {
      return next(new AppError('Not authorized to view messages', 403));
    }

    res.status(200).json({
      success: true,
      data: chat.messages,
    });
  } catch (error) {
    next(error);
  }
};

export const createConversation = async (req, res, next) => {
  try {
    const { participantId, type = 'direct', groupName } = req.body;

    if (type === 'direct') {
      // Check if conversation already exists
      let chat = await Chat.findOne({
        type: 'direct',
        participants: { $all: [req.user.id, participantId] },
      }).populate('participants', 'name avatar role');

      if (chat) {
        return res.status(200).json({ success: true, data: chat });
      }

      chat = await Chat.create({
        type: 'direct',
        participants: [req.user.id, participantId],
      });

      const populated = await Chat.findById(chat._id).populate('participants', 'name avatar role');
      return res.status(201).json({ success: true, data: populated });
    } else {
      // Group chat
      const chat = await Chat.create({
        type: 'group',
        participants: [req.user.id, ...req.body.participants],
        groupName,
        groupAdmin: req.user.id,
      });

      const populated = await Chat.findById(chat._id).populate('participants', 'name avatar role');
      return res.status(201).json({ success: true, data: populated });
    }
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, messageType, fileUrl } = req.body;

    const chat = await Chat.findById(id);
    if (!chat) return next(new AppError('Chat not found', 404));

    const newMessage = {
      sender: req.user.id,
      content,
      messageType: messageType || 'text',
      fileUrl,
      readBy: [req.user.id],
      createdAt: new Date(),
    };

    chat.messages.push(newMessage);
    chat.lastMessage = {
      content: messageType === 'text' ? content : `Sent an ${messageType}`,
      sender: req.user.id,
      createdAt: newMessage.createdAt,
    };

    await chat.save();

    res.status(201).json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    next(error);
  }
};
