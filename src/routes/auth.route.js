import express from "express";
import { body } from "express-validator";

import * as authController from "../controllers/auth.controller.js";

import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.post(
  "/register",
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  validate,
  auth.register,
);

router.post("/login", auth.login);
router.post("/logout", auth.logout);
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password", auth.resetPassword);

export default router;
