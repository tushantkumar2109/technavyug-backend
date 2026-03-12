import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const HomepageContent = sequelize.define("HomepageContent", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  section: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Section identifier: hero, features, testimonials, cta, etc.",
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subtitle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  buttonText: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  buttonLink: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Additional key-value data for flexible content",
  },
});

export default HomepageContent;
