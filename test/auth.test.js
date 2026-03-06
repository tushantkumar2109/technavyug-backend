import { jest } from "@jest/globals";
import "dotenv/config";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import VerificationToken from "../src/models/verificationToken.js";
import RefreshToken from "../src/models/refreshToken.js";

let mongoServer;

// Initialize the in-memory database before all tests run
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongoUri);
});

// Clean up the database and clear mock histories between each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  jest.clearAllMocks();
});

// Disconnect and shut down the memory server after all tests are complete
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Authentication API Endpoints", () => {
  // Registration Flow Tests
  describe("POST /api/v1/auth/register", () => {
    test("Should successfully register a new user and trigger an email", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "Student",
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toMatch(/registered successfully/i);

      // Verify the user exists in the database
      const userInDb = await User.findOne({ email: "john@example.com" });
      expect(userInDb).not.toBeNull();
      expect(userInDb.emailVerified).toBe(false);

      // Verify a verification token was created
      const tokenInDb = await VerificationToken.findOne({
        userId: userInDb._id,
      });
      expect(tokenInDb).not.toBeNull();
      expect(tokenInDb.type).toBe("VERIFY_EMAIL");
    });

    test("Should fail if the email is already registered", async () => {
      await User.create({
        name: "Existing User",
        email: "existing@example.com",
        password: "hashedpassword",
      });

      const response = await request(app).post("/api/v1/auth/register").send({
        name: "New User",
        email: "existing@example.com",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User already exists");
    });

    test("Should fail validation on invalid email or short password", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "Invalid User",
        email: "not-an-email",
        password: "123", // Too short
      });

      expect(response.status).toBe(422);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  // Login Flow Tests
  describe("POST /api/v1/auth/login", () => {
    let testUser;
    const plainPassword = "securepassword";

    beforeEach(async () => {
      // Seed a user before testing login
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      testUser = await User.create({
        name: "Login User",
        email: "login@example.com",
        password: hashedPassword,
      });
    });

    test("Should successfully log in with correct credentials", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "login@example.com",
        password: plainPassword,
      });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();

      // Check if refresh token was saved to the database
      const tokenInDb = await RefreshToken.findOne({ userId: testUser._id });
      expect(tokenInDb).not.toBeNull();
      expect(tokenInDb.isRevoked).toBe(false);

      // Check if cookie was set
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/refreshToken=/);
    });

    test("Should fail with incorrect password", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "login@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Email or password is incorrect");
    });

    test("Should fail with non-existent email", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "nobody@example.com",
        password: plainPassword,
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User not found");
    });
  });

  // Logout Flow Tests
  describe("POST /api/v1/auth/logout", () => {
    test("Should successfully log out and revoke token", async () => {
      const mockUserId = new mongoose.Types.ObjectId();
      const mockToken = "mock-refresh-token-string";

      // Seed a refresh token to revoke
      await RefreshToken.create({
        userId: mockUserId,
        token: mockToken,
        expiresAt: Date.now() + 100000,
      });

      const response = await request(app)
        .post("/api/v1/auth/logout")
        .send({ refreshToken: mockToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("User logged out successfully");

      // Verify the token was revoked in the database
      const revokedToken = await RefreshToken.findOne({ token: mockToken });
      expect(revokedToken.isRevoked).toBe(true);
    });
  });

  // Password Reset Flow Tests
  describe("Forgot and Reset Password", () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: "Reset User",
        email: "reset@example.com",
        password: "oldpassword",
      });
    });

    test("Should send a reset password email for a valid user", async () => {
      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "reset@example.com" });

      expect(response.status).toBe(200);

      const resetTokenDb = await VerificationToken.findOne({
        userId: testUser._id,
        type: "RESET_PASSWORD",
      });
      expect(resetTokenDb).not.toBeNull();
    });

    test("Should fail forgot password for non-existent email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "unknown@example.com" });

      expect(response.status).toBe(404);
    });

    test("Should successfully reset the password with a valid token", async () => {
      const validToken = "valid-reset-token-123";

      // Seed a valid reset token
      await VerificationToken.create({
        userId: testUser._id,
        token: validToken,
        type: "RESET_PASSWORD",
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .query({ token: validToken })
        .send({ password: "newsecurepassword" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Password reset successfully");

      // Verify the token was deleted
      const tokenExists = await VerificationToken.findOne({
        token: validToken,
      });
      expect(tokenExists).toBeNull();

      // Verify the password was actually updated
      const updatedUser = await User.findById(testUser._id);
      const isMatch = await bcrypt.compare(
        "newsecurepassword",
        updatedUser.password,
      );
      expect(isMatch).toBe(true);
    });

    test("Should fail reset password with an invalid token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .query({ token: "invalid-or-fake-token" })
        .send({ password: "newsecurepassword" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid or expired token");
    });
  });
});
