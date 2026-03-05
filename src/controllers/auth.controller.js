import bcrypt from "bcryptjs";
import crypto from "crypto";

import User from "../models/user.model.js";
import VerificationToken from "../models/verificationToken.js";
import RefreshToken from "../models/refreshToken.js";

import sendEmail from "../services/email.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../services/token.service.js";

import Logger from "../utlis/logger.js";

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      Logger.error("User already exists");
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Generate a verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    await VerificationToken.create({
      userId: user._id,
      token: verificationToken,
      type: "VERIFY_EMAIL",
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    // Send verification email
    await sendEmail(
      user.email,
      "Verify your email",
      `Please click <a href="${process.env.BASE_URL}/verify-email?token=${verificationToken}">here</a> to verify your email.`,
    );

    Logger.info("User registered successfully");
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    Logger.error("Error during user registration", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      Logger.error("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      Logger.error("Email or password is incorrect");
      return res
        .status(401)
        .json({ message: "Email or password is incorrect" });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, rememberMe);

    // Save refresh token
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: rememberMe
        ? Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        : Date.now() + 24 * 60 * 60 * 1000, // or 1 day
    });

    Logger.info("User logged in successfully");
    res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    Logger.error("Error during user login", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await RefreshToken.findOneAndDelete(
      { token: refreshToken },
      { isRevoked: true },
    );

    Logger.info("User logged out successfully");
    res.clearCookie("refreshToken");
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    Logger.error("Error during user logout", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      Logger.error("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    await VerificationToken.create({
      userId: user._id,
      token,
      type: "RESET_PASSWORD",
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    await sendEmail(
      user.email,
      "Reset Password",
      `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
    );

    Logger.info("Password reset email sent successfully");
    res.status(200).json({ message: "Password reset email sent successfully" });
  } catch (error) {
    Logger.error("Error during forgot password", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = req.query.token;
    const { password } = req.body;

    const record = await VerificationToken.findOne({
      token,
      type: "RESET_PASSWORD",
      expiresAt: { $gt: Date.now() },
    });

    if (!record) {
      Logger.error("Invalid or expired token");
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      Logger.error("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    await VerificationToken.deleteOne({ token });

    Logger.info("Password reset successfully");
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    Logger.error("Error during reset password", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
};
