import {
  User,
  Enrollment,
  MonthlyGoal,
  LectureProgress,
} from "../models/index.js";
import Logger from "../utils/logger.js";

const getStudentDashboard = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id",
        "name",
        "currentStreak",
        "longestStreak",
        "lastStudyDate",
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if streak is still valid (IST, 6 AM boundary)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const adjusted = new Date(istNow.getTime() - 6 * 60 * 60 * 1000);
    const todayStr = adjusted.toISOString().split("T")[0];

    const adjustedYesterday = new Date(adjusted);
    adjustedYesterday.setDate(adjustedYesterday.getDate() - 1);
    const yesterdayStr = adjustedYesterday.toISOString().split("T")[0];

    let streakStatus = "active"; // studied today
    if (user.lastStudyDate === yesterdayStr) {
      streakStatus = "at_risk"; // hasn't studied today yet, but streak still valid
    } else if (
      user.lastStudyDate !== todayStr &&
      user.lastStudyDate !== yesterdayStr
    ) {
      streakStatus = "broken"; // streak is broken
    }

    // Get last 7 days study activity
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(adjusted);
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split("T")[0]);
    }

    // Find which of the last 7 days had completed lectures
    const recentProgress = await LectureProgress.findAll({
      where: {
        userId: req.user.id,
        completed: true,
      },
      attributes: ["completedAt"],
      raw: true,
    });

    const studiedDays = new Set();
    for (const p of recentProgress) {
      if (p.completedAt) {
        // Convert to IST 6AM-boundary date
        const pDate = new Date(p.completedAt);
        const pIst = new Date(pDate.getTime() + istOffset);
        const pAdj = new Date(pIst.getTime() - 6 * 60 * 60 * 1000);
        studiedDays.add(pAdj.toISOString().split("T")[0]);
      }
    }

    const weekActivity = last7Days.map((day) => ({
      date: day,
      studied: studiedDays.has(day),
    }));

    // Completed courses
    const completedCourses = await Enrollment.count({
      where: { userId: req.user.id, status: "Completed" },
    });

    // Total learning hours (rough estimate: each completed lecture ~ 15 min)
    const totalCompletedLectures = await LectureProgress.count({
      where: { userId: req.user.id, completed: true },
    });
    const learningHours = Math.round((totalCompletedLectures * 15) / 60);

    // Current monthly goal
    const currentMonth = istNow.getMonth() + 1;
    const currentYear = istNow.getFullYear();
    const monthlyGoal = await MonthlyGoal.findOne({
      where: {
        userId: req.user.id,
        month: currentMonth,
        year: currentYear,
      },
    });

    // Days remaining in month
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = istNow.getDate();
    const daysRemaining = daysInMonth - currentDay;

    res.status(200).json({
      data: {
        streak: {
          current: user.currentStreak,
          longest: user.longestStreak,
          lastStudyDate: user.lastStudyDate,
          status: streakStatus,
        },
        weekActivity,
        stats: {
          completedCourses,
          totalCompletedLectures,
          learningHours: `${learningHours}h`,
        },
        monthlyGoal: monthlyGoal
          ? {
              id: monthlyGoal.id,
              goalName: monthlyGoal.goalName,
              targetLectures: monthlyGoal.targetLectures,
              completedLectures: monthlyGoal.completedLectures,
              status: monthlyGoal.status,
              daysRemaining,
              progressPercent:
                monthlyGoal.targetLectures > 0
                  ? Math.round(
                      (monthlyGoal.completedLectures /
                        monthlyGoal.targetLectures) *
                        100,
                    )
                  : 0,
            }
          : null,
      },
    });
  } catch (error) {
    Logger.error("Error fetching student dashboard", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const setMonthlyGoal = async (req, res) => {
  try {
    const { targetLectures, goalName } = req.body;

    if (!targetLectures || targetLectures < 1) {
      return res
        .status(400)
        .json({ message: "targetLectures must be at least 1" });
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const currentMonth = istNow.getMonth() + 1;
    const currentYear = istNow.getFullYear();

    const [goal, created] = await MonthlyGoal.findOrCreate({
      where: {
        userId: req.user.id,
        month: currentMonth,
        year: currentYear,
      },
      defaults: {
        targetLectures,
        goalName: goalName || null,
        status: "Active",
      },
    });

    if (!created) {
      // Update existing goal
      goal.targetLectures = targetLectures;
      if (goalName !== undefined) goal.goalName = goalName;
      if (goal.completedLectures >= targetLectures) {
        goal.status = "Completed";
      } else {
        goal.status = "Active";
      }
      await goal.save();
    }

    res.status(created ? 201 : 200).json({
      message: created ? "Monthly goal created" : "Monthly goal updated",
      data: goal,
    });
  } catch (error) {
    Logger.error("Error setting monthly goal", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getMonthlyGoal = async (req, res) => {
  try {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const currentMonth = istNow.getMonth() + 1;
    const currentYear = istNow.getFullYear();

    const goal = await MonthlyGoal.findOne({
      where: {
        userId: req.user.id,
        month: currentMonth,
        year: currentYear,
      },
    });

    if (!goal) {
      return res.status(200).json({ data: null });
    }

    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = istNow.getDate();
    const daysRemaining = daysInMonth - currentDay;

    res.status(200).json({
      data: {
        ...goal.toJSON(),
        daysRemaining,
        progressPercent:
          goal.targetLectures > 0
            ? Math.round((goal.completedLectures / goal.targetLectures) * 100)
            : 0,
      },
    });
  } catch (error) {
    Logger.error("Error fetching monthly goal", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default {
  getStudentDashboard,
  setMonthlyGoal,
  getMonthlyGoal,
};
