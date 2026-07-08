import Notification from '../models/Notification.js';

let ioInstance = null;

export const setIoInstance = (io) => {
  ioInstance = io;
};

export const createNotification = async ({ recipient, sender, type, message, link }) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      message,
      link,
    });

    // Populate sender details for real-time notification
    const populated = await Notification.findById(notification._id)
      .populate('sender', 'name avatar')
      .exec();

    // If socket.io is running, emit notification to recipient's room
    if (ioInstance) {
      ioInstance.to(recipient.toString()).emit('new-notification', populated);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
