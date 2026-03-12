import { Notification, User } from "../models/index.js";
import { getPagination, getPaginatedResponse } from "../utils/pagination.js";
import {
  createNotification as createNotificationService,
  createBulkNotifications,
} from "../services/notification.service.js";
import Logger from "../utils/logger.js";

const getMyNotifications = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { isRead } = req.query;

    const where = { userId: req.user.id };
    if (isRead !== undefined) where.isRead = isRead === "true";

    const { count, rows } = await Notification.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(getPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    Logger.error("Error fetching notifications", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.status(200).json({ data: { unreadCount: count } });
  } catch (error) {
    Logger.error("Error fetching unread count", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    Logger.error("Error marking notification as read", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { userId: req.user.id, isRead: false } },
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    Logger.error("Error marking all notifications as read", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await notification.destroy();
    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    Logger.error("Error deleting notification", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Admin: send notification to a user or all users
const sendNotification = async (req, res) => {
  try {
    const { userId, title, message, type, channel, link, sendToAll } = req.body;

    if (sendToAll) {
      const users = await User.findAll({ attributes: ["id"] });
      const userIds = users.map((u) => u.id);
      const notifications = await createBulkNotifications(userIds, {
        title,
        message,
        type,
        channel,
        link,
      });
      Logger.info("Bulk notifications sent", { count: notifications.length });
      return res.status(201).json({
        message: `Notification sent to ${notifications.length} users`,
      });
    }

    if (!userId) {
      return res
        .status(400)
        .json({ message: "userId is required when sendToAll is false" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const notification = await createNotificationService({
      userId,
      title,
      message,
      type,
      channel,
      link,
      email: user.email,
    });

    Logger.info("Notification sent", { notificationId: notification.id });
    res
      .status(201)
      .json({ message: "Notification sent successfully", data: notification });
  } catch (error) {
    Logger.error("Error sending notification", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendNotification,
};
