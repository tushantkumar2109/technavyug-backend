import express from "express";
import { body } from "express-validator";

import authController from "../controllers/auth.controller.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

// Registration route with input validation
router.post(
  "/register",
  body("email").isEmail().withMessage("Provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  validate,
  authController.register,
);

router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
