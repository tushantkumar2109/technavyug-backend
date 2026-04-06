import express from "express";
import studentController from "../controllers/student.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

// Dashboard data (streak, stats, goal)
router.get("/dashboard", studentController.getStudentDashboard);

// Monthly goals
router.post("/goals/monthly", studentController.setMonthlyGoal);
router.get("/goals/monthly", studentController.getMonthlyGoal);

export default router;
