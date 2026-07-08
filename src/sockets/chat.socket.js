import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Chat from '../models/Chat.js';

const onlineUsers = new Map(); // userId -> socketId

export const initializeSocket = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
      
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const tokenValue = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id).select('name avatar role');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket authentication error:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);
    
    // Join a personal room named after the userId for direct notifications
    socket.join(userId);
    
    // Broadcast user online status
    io.emit('user-status-changed', { userId, status: 'online' });
    console.log(`User connected: ${socket.user.name} (${socket.id})`);

    // Handle joining chat room
    socket.on('join-chat', (chatId) => {
      socket.join(chatId);
      console.log(`Socket ${socket.id} joined chat room: ${chatId}`);
    });

    // Handle leaving chat room
    socket.on('leave-chat', (chatId) => {
      socket.leave(chatId);
      console.log(`Socket ${socket.id} left chat room: ${chatId}`);
    });

    // Handle sending message
    socket.on('send-message', async (data) => {
      try {
        const { chatId, content, messageType, fileUrl } = data;
        
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        const newMessage = {
          sender: socket.user._id,
          content,
          messageType: messageType || 'text',
          fileUrl,
          readBy: [socket.user._id],
          createdAt: new Date(),
        };

        chat.messages.push(newMessage);
        chat.lastMessage = {
          content: messageType === 'text' ? content : `Sent a ${messageType}`,
          sender: socket.user._id,
          createdAt: newMessage.createdAt,
        };

        await chat.save();

        const populatedChat = await Chat.findById(chatId)
          .populate('messages.sender', 'name avatar')
          .exec();
        
        const savedMessage = populatedChat.messages[populatedChat.messages.length - 1];

        // Broadcast to chat room
        io.to(chatId).emit('message-received', { chatId, message: savedMessage });

        // Notify participants who aren't currently in the room
        chat.participants.forEach(participantId => {
          const idStr = participantId.toString();
          if (idStr !== userId) {
            // Emits unread counts or brief banners
            io.to(idStr).emit('unread-message', { chatId, sender: socket.user.name, content: savedMessage.content });
          }
        });

      } catch (error) {
        console.error('Socket send-message error:', error);
      }
    });

    // Handle typing status
    socket.on('typing', ({ chatId }) => {
      socket.to(chatId).emit('user-typing', { chatId, userId, name: socket.user.name });
    });

    socket.on('stop-typing', ({ chatId }) => {
      socket.to(chatId).emit('user-stop-typing', { chatId, userId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user-status-changed', { userId, status: 'offline' });
      console.log(`User disconnected: ${socket.user.name} (${socket.id})`);
    });
  });
};

export const getOnlineUsers = () => onlineUsers;
