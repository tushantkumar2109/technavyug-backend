import { jest } from "@jest/globals";
import "dotenv/config";
import request from "supertest";
import bcrypt from "bcryptjs";

import app from "../src/app.js";
import {
  sequelize,
  User,
  VerificationToken,
  RefreshToken,
} from "../src/models/index.js";

jest.unstable_mockModule("../src/services/email.service.js", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Tell Jest to wait up to 15 seconds before failing a test
jest.setTimeout(15000);

// Initialize Sequelize Database before all tests run
beforeAll(async () => {
  await sequelize.authenticate();
});

// Clean up the database and clear mock histories between each test
beforeEach(async () => {
  // force: true drops all tables and recreates them, ensuring a clean slate for each test
  await sequelize.sync({ force: true });
  jest.clearAllMocks();
});

// Disconnect and shut down the database connection after all tests are complete
afterAll(async () => {
  await sequelize.close();
});

describe("Authentication API Endpoints", () => {
  // Registration Flow Tests
  describe("POST /api/v1/auth/register", () => {
    test("Should successfully register a new user", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "Student",
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toMatch(/registered successfully/i);

      // Verify the user exists in the database
      const userInDb = await User.findOne({
        where: { email: "john@example.com" },
      });
      expect(userInDb).not.toBeNull();
      expect(userInDb.emailVerified).toBe(false);

      // Verify a verification token was created
      const tokenInDb = await VerificationToken.findOne({
        where: { userId: userInDb.id },
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

      expect(response.status).toBe(409);
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
        emailVerified: true,
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
      const tokenInDb = await RefreshToken.findOne({
        where: { userId: testUser.id },
      });
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
      // FIX: Create an actual user in the DB to satisfy the Foreign Key constraint
      const user = await User.create({
        name: "Logout User",
        email: "logoutuser@example.com",
        password: "password123",
      });

      const mockToken = "mock-refresh-token-string";

      // Seed a refresh token to revoke, using the real user's ID
      await RefreshToken.create({
        userId: user.id,
        token: mockToken,
        expiresAt: new Date(Date.now() + 100000),
      });

      const response = await request(app)
        .post("/api/v1/auth/logout")
        .send({ refreshToken: mockToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("User logged out successfully");

      // Verify the token was revoked in the database
      const revokedToken = await RefreshToken.findOne({
        where: { token: mockToken },
      });
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

    test("Should successfully generate a reset password token for a valid user", async () => {
      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "reset@example.com" });

      expect(response.status).toBe(200);

      const resetTokenDb = await VerificationToken.findOne({
        where: {
          userId: testUser.id,
          type: "RESET_PASSWORD",
        },
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
        userId: testUser.id,
        token: validToken,
        type: "RESET_PASSWORD",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .query({ token: validToken })
        .send({ password: "newsecurepassword" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Password reset successfully");

      // Verify the token was deleted
      const tokenExists = await VerificationToken.findOne({
        where: { token: validToken },
      });
      expect(tokenExists).toBeNull();

      // Verify the password was actually updated
      const updatedUser = await User.findByPk(testUser.id);
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

  // Email Verification Flow Tests
  describe("POST /api/v1/auth/verify-email", () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      // Seed an unverified user
      testUser = await User.create({
        name: "Unverified User",
        email: "unverified@example.com",
        password: "password123",
        emailVerified: false,
      });

      validToken = "valid-verify-token-123";

      // Seed a valid verification token linked to the user
      await VerificationToken.create({
        userId: testUser.id,
        token: validToken,
        type: "VERIFY_EMAIL",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
    });

    test("Should successfully verify account with a valid token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({ token: validToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Email verified successfully");

      // Verify the user's status was updated in the database
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.emailVerified).toBe(true);

      // Verify the token was securely deleted
      const tokenExists = await VerificationToken.findOne({
        where: { token: validToken },
      });
      expect(tokenExists).toBeNull();
    });

    test("Should fail with an invalid or expired token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/verify-email")
        .query({ token: "some-fake-invalid-token" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid or expired token");
    });

    test("Should fail if token is missing entirely", async () => {
      const response = await request(app).get("/api/v1/auth/verify-email"); // No query parameters

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Verification token is required");
    });
  });
});
