import express from "express";
import { body } from "express-validator";
import contactController from "../controllers/contact.controller.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.post(
  "/",
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Provide a valid email"),
  body("subject").notEmpty().withMessage("Subject is required"),
  body("message")
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 10 })
    .withMessage("Message must be at least 10 characters"),
  validate,
  contactController.submitContactForm,
);

export default router;
