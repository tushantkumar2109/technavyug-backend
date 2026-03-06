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

import Logger from "../utils/logger.js";

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      Logger.warn("Registration attempt with existing email", { email });
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
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
    const verificationUrl = `${process.env.BASE_URL}/api/v1/auth/verify-email?token=${verificationToken}`;
    await sendEmail(
      user.email,
      "Verify your email",
      `<p>Please click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
    );

    Logger.info("User registered successfully", { userId: user._id });
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    Logger.error("Error during user registration", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const token = req.query.token;

    if (!token) {
      Logger.warn("Email verification attempted without a token");
      return res
        .status(400)
        .json({ message: "Verification token is required" });
    }

    // Look for a valid, unexpired token of the correct type
    const record = await VerificationToken.findOne({
      token,
      type: "VERIFY_EMAIL",
      expiresAt: { $gt: Date.now() },
    });

    if (!record) {
      Logger.warn("Attempt to use invalid or expired verification token");
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Identify the user associated with the token
    const user = await User.findById(record.userId);
    if (!user) {
      Logger.error("User associated with verification token not found", {
        userId: record.userId,
      });
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user is already verified (edge case protection)
    if (user.emailVerified) {
      Logger.info("User attempted to verify an already verified email", {
        userId: user._id,
      });

      // Delete the redundant token just in case
      await VerificationToken.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Update the user's status
    user.emailVerified = true;
    await user.save();

    // Clean up the used token
    await VerificationToken.deleteOne({ _id: record._id });

    Logger.info("Email verified successfully", { userId: user._id });
    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    Logger.error("Error during email verification", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      Logger.warn("Login attempt with non-existent email", { email });
      return res.status(404).json({ message: "User not found" });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      Logger.warn("Invalid password attempt", { email });
      return res
        .status(401)
        .json({ message: "Email or password is incorrect" });
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, rememberMe);

    // Calculate expiration logic
    const refreshTokenMaxAge = rememberMe
      ? 7 * 24 * 60 * 60 * 1000 // 7 days
      : 24 * 60 * 60 * 1000; // 1 day

    // Save refresh token to database
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: Date.now() + refreshTokenMaxAge,
    });

    // Set HTTP-only cookie for the refresh token
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: refreshTokenMaxAge,
    });

    Logger.info("User logged in successfully", { userId: user._id });
    res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    Logger.error("Error during user login", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const logout = async (req, res) => {
  try {
    // Extract token from body or cookies
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (refreshToken) {
      // Find and update the token to mark it as revoked
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isRevoked: true },
      );
    }

    // Clear the HTTP-only cookie
    res.clearCookie("refreshToken");

    Logger.info("User logged out successfully");
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    Logger.error("Error during user logout", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate user existence
    const user = await User.findOne({ email });
    if (!user) {
      Logger.warn("Forgot password requested for unknown email", { email });
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");

    await VerificationToken.create({
      userId: user._id,
      token,
      type: "RESET_PASSWORD",
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    // Dispatch reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail(
      user.email,
      "Reset Password",
      `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 15 minutes.</p>`,
    );

    Logger.info("Password reset email sent successfully", { email });
    res.status(200).json({ message: "Password reset email sent successfully" });
  } catch (error) {
    Logger.error("Error during forgot password", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = req.query.token || req.body.token; // Check both query and body
    const { password } = req.body;

    // Look for a valid, unexpired token of the correct type
    const record = await VerificationToken.findOne({
      token,
      type: "RESET_PASSWORD",
      expiresAt: { $gt: Date.now() },
    });

    if (!record) {
      Logger.warn("Attempt to use invalid or expired reset token");
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Identify user
    const user = await User.findById(record.userId);
    if (!user) {
      Logger.error("User associated with reset token not found", {
        userId: record.userId,
      });
      return res.status(404).json({ message: "User not found" });
    }

    // Update password securely
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    // Clean up the used token
    await VerificationToken.deleteOne({ token });

    Logger.info("Password reset successfully", { userId: user._id });
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    Logger.error("Error during reset password", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default {
  register,
  verifyEmail,
  login,
  logout,
  forgotPassword,
  resetPassword,
};
