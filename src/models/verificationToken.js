import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const VerificationToken = sequelize.define("VerificationToken", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("VERIFY_EMAIL", "RESET_PASSWORD"),
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

export default VerificationToken;
