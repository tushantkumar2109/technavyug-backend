import express from "express";
import { body } from "express-validator";
import paymentController from "../controllers/payment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/initiate",
  body("orderId").notEmpty().withMessage("Order ID is required"),
  body("gateway")
    .isIn(["Stripe", "Razorpay"])
    .withMessage("Gateway must be Stripe or Razorpay"),
  validate,
  paymentController.initiatePayment,
);

router.post(
  "/confirm",
  body("paymentId").notEmpty().withMessage("Payment ID is required"),
  body("gatewayPaymentId")
    .notEmpty()
    .withMessage("Gateway Payment ID is required"),
  validate,
  paymentController.confirmPayment,
);

router.get("/:id", paymentController.getPaymentById);

export default router;
