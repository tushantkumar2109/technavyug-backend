import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  token: {
    type: String,
    enum: ["VERIFY_EMAIL", "RESET_PASSWORD"],
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

const VerificationToken = mongoose.model("VerificationToken", tokenSchema);

export default VerificationToken;
