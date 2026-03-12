import express from "express";
import { body } from "express-validator";
import reviewController from "../controllers/review.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

// Public
router.get("/course/:courseId", reviewController.getCourseReviews);

// Authenticated
router.post(
  "/",
  authenticate,
  body("courseId").notEmpty().withMessage("Course ID is required"),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  validate,
  reviewController.createReview,
);

router.put("/:id", authenticate, reviewController.updateReview);
router.delete("/:id", authenticate, reviewController.deleteReview);

export default router;
