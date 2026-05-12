import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Transaction = sequelize.define(
  "Transaction",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    merchantOrderId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "Unique idempotency key sent to PhonePe",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Final amount after discount (in rupees)",
    },
    originalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Amount before coupon discount",
    },
    status: {
      type: DataTypes.ENUM("Pending", "Success", "Failed"),
      defaultValue: "Pending",
    },
    paymentType: {
      type: DataTypes.ENUM("course", "product"),
      allowNull: false,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Set when paymentType is course",
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Set when paymentType is product",
    },
    couponId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    phonepeTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "PhonePe transaction reference returned after payment",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Raw PhonePe response data",
    },
  },
  {
    indexes: [
      { fields: ["userId"] },
      { fields: ["status"] },
      { fields: ["merchantOrderId"], unique: true },
    ],
  },
);

export default Transaction;
