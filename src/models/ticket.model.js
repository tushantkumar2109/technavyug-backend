import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Ticket = sequelize.define("Ticket", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  ticketNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("Open", "InProgress", "Resolved", "Closed"),
    defaultValue: "Open",
  },
  priority: {
    type: DataTypes.ENUM("Low", "Medium", "High", "Urgent"),
    defaultValue: "Medium",
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: "Admin or Sub Admin assigned to this ticket",
  },
});

export default Ticket;
