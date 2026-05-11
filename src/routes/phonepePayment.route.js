import express from "express";
import { body } from "express-validator";
import phonepePaymentController from "../controllers/phonepePayment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

// Course purchase
router.post(
  "/initiate-course-payment",
  authenticate,
  body("courseId").notEmpty().withMessage("Course ID is required"),
  validate,
  phonepePaymentController.initiateCoursePurchase,
);

router.get(
  "/course-payment-status/:merchantOrderId",
  authenticate,
  phonepePaymentController.getCoursePurchaseStatus,
);

// Product order payment
router.post(
  "/initiate-order-payment",
  authenticate,
  body("items")
    .isArray({ min: 1 })
    .withMessage("Order must contain at least one item"),
  body("addressId").notEmpty().withMessage("Address ID is required"),
  validate,
  phonepePaymentController.initiateOrderPayment,
);

router.get(
  "/order-payment-status/:merchantOrderId",
  authenticate,
  phonepePaymentController.getOrderPaymentStatus,
);

// Webhook (no auth - PhonePe server callback)
router.post("/webhook", phonepePaymentController.handleWebhook);

// Transaction details
router.get(
  "/transaction/:id",
  authenticate,
  phonepePaymentController.getTransaction,
);

export default router;
