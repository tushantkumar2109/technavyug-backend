import express from "express";
import userController from "../../controllers/admin/user.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorize("Admin", "Sub Admin"));

router.get("/", userController.listUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);
router.patch("/:id/block", userController.blockUser);
router.patch("/:id/unblock", userController.unblockUser);

export default router;
