import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Lecture = sequelize.define("Lecture", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("Video", "Document", "Quiz"),
    defaultValue: "Video",
  },
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "AWS S3 or Vimeo URL",
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: "Duration in seconds",
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Text content for Document type lectures",
  },
  resources: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: "Array of resource objects: [{name, url, type}]",
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  isFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "Whether this lecture can be previewed without enrollment",
  },
});

export default Lecture;
