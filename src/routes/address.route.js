import express from "express";
import { body } from "express-validator";
import addressController from "../controllers/address.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", addressController.getMyAddresses);

router.post(
  "/",
  body("name").notEmpty().withMessage("Recipient name is required"),
  body("phone").notEmpty().withMessage("Phone number is required"),
  body("addressLine1").notEmpty().withMessage("Address line 1 is required"),
  body("city").notEmpty().withMessage("City is required"),
  body("state").notEmpty().withMessage("State is required"),
  body("pincode").notEmpty().withMessage("Pincode is required"),
  validate,
  addressController.createAddress,
);

router.put("/:id", addressController.updateAddress);
router.delete("/:id", addressController.deleteAddress);
router.patch("/:id/default", addressController.setDefaultAddress);

export default router;
