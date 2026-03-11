import sequelize from "../config/db.js";
import User from "./user.model.js";
import RefreshToken from "./refreshToken.js";
import VerificationToken from "./verificationToken.js";

// Database Relationships (Foreign Keys)
User.hasMany(RefreshToken, { foreignKey: "userId", onDelete: "CASCADE" });
RefreshToken.belongsTo(User, { foreignKey: "userId" });

User.hasMany(VerificationToken, { foreignKey: "userId", onDelete: "CASCADE" });
VerificationToken.belongsTo(User, { foreignKey: "userId" });

export { sequelize, User, RefreshToken, VerificationToken };
