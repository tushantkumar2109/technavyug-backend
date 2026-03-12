import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Enrollment = sequelize.define(
  "Enrollment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    enrolledAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("Active", "Completed", "Cancelled"),
      defaultValue: "Active",
    },
    progress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.0,
      comment: "Completion percentage 0-100",
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["userId", "courseId"],
      },
    ],
  },
);

export default Enrollment;
