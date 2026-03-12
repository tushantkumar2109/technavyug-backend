import { Notification } from "../models/index.js";
import sendEmail from "./email.service.js";
import Logger from "../utils/logger.js";

const createNotification = async ({
  userId,
  title,
  message,
  type = "Info",
  channel = "InApp",
  link = null,
  email = null,
}) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      channel,
      link,
    });

    if ((channel === "Email" || channel === "Both") && email) {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">${title}</h2>
          <p style="font-size: 16px; color: #444;">${message}</p>
          ${link ? `<a href="${link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;margin-top:10px;">View Details</a>` : ""}
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} Technavyug Platform</p>
        </div>
      `;

      try {
        await sendEmail(email, title, htmlContent);
      } catch (emailError) {
        Logger.error("Failed to send notification email", emailError);
      }
    }

    return notification;
  } catch (error) {
    Logger.error("Error creating notification", error);
    throw error;
  }
};

/**
 * Send bulk notifications to multiple users.
 */
const createBulkNotifications = async (
  userIds,
  { title, message, type = "Info", channel = "InApp", link = null },
) => {
  const notifications = [];
  for (const userId of userIds) {
    try {
      const notification = await Notification.create({
        userId,
        title,
        message,
        type,
        channel,
        link,
      });
      notifications.push(notification);
    } catch (error) {
      Logger.error("Error creating bulk notification", { userId, error });
    }
  }
  return notifications;
};

export { createNotification, createBulkNotifications };
