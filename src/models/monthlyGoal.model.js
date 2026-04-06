import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const MonthlyGoal = sequelize.define(
  "MonthlyGoal",
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
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 },
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    goalName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Optional name/description for the goal",
    },
    targetLectures: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
      comment: "Number of lectures the student wants to complete this month",
    },
    completedLectures: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("Active", "Completed", "Failed"),
      defaultValue: "Active",
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["userId", "month", "year"],
      },
    ],
  },
);

export default MonthlyGoal;
