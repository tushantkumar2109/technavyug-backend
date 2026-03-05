import mongoose, { mongo } from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    token: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
