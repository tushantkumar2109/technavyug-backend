import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Course = sequelize.define("Course", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  shortDescription: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  thumbnail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.0,
  },
  level: {
    type: DataTypes.ENUM("Beginner", "Intermediate", "Advanced"),
    defaultValue: "Beginner",
  },
  status: {
    type: DataTypes.ENUM("Draft", "Published", "Archived"),
    defaultValue: "Draft",
  },
  instructorId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: "English",
  },
  totalDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: "Total duration in seconds",
  },
  totalLectures: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  averageRating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0,
  },
  totalReviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  totalEnrollments: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

export default Course;
