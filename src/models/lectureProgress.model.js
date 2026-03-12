import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const LectureProgress = sequelize.define(
  "LectureProgress",
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
    lectureId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["userId", "lectureId"],
      },
    ],
  },
);

export default LectureProgress;
