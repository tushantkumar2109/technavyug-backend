import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Notification = sequelize.define("Notification", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("Info", "Warning", "Success", "Error"),
    defaultValue: "Info",
  },
  channel: {
    type: DataTypes.ENUM("InApp", "Email", "Both"),
    defaultValue: "InApp",
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  link: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Optional deep link for the notification",
  },
});

export default Notification;
