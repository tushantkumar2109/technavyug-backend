import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Payment = sequelize.define("Payment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  gateway: {
    type: DataTypes.ENUM("Stripe", "Razorpay"),
    allowNull: false,
  },
  gatewayPaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  gatewayOrderId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: "INR",
  },
  status: {
    type: DataTypes.ENUM("Pending", "Completed", "Failed", "Refunded"),
    defaultValue: "Pending",
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Raw gateway response data",
  },
});

export default Payment;
