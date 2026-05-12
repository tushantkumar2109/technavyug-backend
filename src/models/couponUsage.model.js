import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const CouponUsage = sequelize.define(
  "CouponUsage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    couponId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    transactionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["couponId", "userId"],
        name: "unique_coupon_per_user",
      },
    ],
  },
);

export default CouponUsage;
