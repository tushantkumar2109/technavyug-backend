import express from "express";
import { body } from "express-validator";
import cmsController from "../controllers/cms.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

// ===== Homepage Content =====
// Public
router.get("/homepage", cmsController.listHomepageContent);

// Admin only
router.post(
  "/homepage",
  authenticate,
  authorize("Admin", "Sub Admin"),
  body("section").notEmpty().withMessage("Section identifier is required"),
  validate,
  cmsController.createHomepageContent,
);

router.put(
  "/homepage/:id",
  authenticate,
  authorize("Admin", "Sub Admin"),
  cmsController.updateHomepageContent,
);

router.delete(
  "/homepage/:id",
  authenticate,
  authorize("Admin", "Sub Admin"),
  cmsController.deleteHomepageContent,
);

// ===== Blogs =====
// Public
router.get("/blogs", cmsController.listBlogs);
router.get("/blogs/:identifier", cmsController.getBlogByIdOrSlug);

// Admin only
router.post(
  "/blogs",
  authenticate,
  authorize("Admin", "Sub Admin"),
  body("title").notEmpty().withMessage("Title is required"),
  body("content").notEmpty().withMessage("Content is required"),
  validate,
  cmsController.createBlog,
);

router.put(
  "/blogs/:id",
  authenticate,
  authorize("Admin", "Sub Admin"),
  cmsController.updateBlog,
);

router.delete(
  "/blogs/:id",
  authenticate,
  authorize("Admin", "Sub Admin"),
  cmsController.deleteBlog,
);

// ===== FAQs =====
// Public
router.get("/faqs", cmsController.listFaqs);

// Admin only
router.post(
  "/faqs",
  authenticate,
  authorize("Admin", "Sub Admin"),
  body("question").notEmpty().withMessage("Question is required"),
  body("answer").notEmpty().withMessage("Answer is required"),
  validate,
  cmsController.createFaq,
);

router.put(
  "/faqs/:id",
  authenticate,
  authorize("Admin", "Sub Admin"),
  cmsController.updateFaq,
);

router.delete(
  "/faqs/:id",
  authenticate,
  authorize("Admin", "Sub Admin"),
  cmsController.deleteFaq,
);

export default router;
