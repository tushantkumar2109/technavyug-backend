import { Op } from "sequelize";
import { User, MonthlyGoal } from "../models/index.js";
import sendEmail from "./email.service.js";
import streakReminderTemplate from "../templates/email/streakReminder.template.js";
import goalReminderTemplate from "../templates/email/goalReminder.template.js";
import Logger from "../utils/logger.js";

/**
 * Get the current IST date string adjusted for 6 AM boundary.
 * The "study day" starts at 6 AM IST, so we subtract 6 hours from IST time.
 */
const getISTStudyDate = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const adjusted = new Date(istNow.getTime() - 6 * 60 * 60 * 1000);
  return {
    istNow,
    todayStr: adjusted.toISOString().split("T")[0],
    yesterdayStr: (() => {
      const y = new Date(adjusted);
      y.setDate(y.getDate() - 1);
      return y.toISOString().split("T")[0];
    })(),
  };
};

/**
 * Check and send streak-at-risk reminders.
 * Runs daily at 3 PM IST.
 *
 * Logic:
 * - Find users with currentStreak > 0 AND lastStudyDate = yesterday (6AM boundary)
 * - These users haven't studied today and will lose their streak at 6 AM tomorrow
 * - Skip users who never started a streak (currentStreak === 0)
 */
const checkStreakReminders = async () => {
  try {
    const { yesterdayStr } = getISTStudyDate();

    // Users whose last study was yesterday — streak is at risk
    const atRiskUsers = await User.findAll({
      where: {
        currentStreak: { [Op.gt]: 0 },
        lastStudyDate: yesterdayStr,
        role: "Student",
        status: "Active",
      },
      attributes: ["id", "name", "email", "currentStreak"],
    });

    Logger.info(`Streak reminder check: ${atRiskUsers.length} user(s) at risk`);

    for (const user of atRiskUsers) {
      try {
        const html = streakReminderTemplate(user.name, user.currentStreak);
        await sendEmail(
          user.email,
          `🔥 Don't lose your ${user.currentStreak}-day streak!`,
          html,
        );
        Logger.info(`Streak reminder sent to ${user.email}`);
      } catch (emailError) {
        Logger.error(
          `Failed to send streak reminder to ${user.email}`,
          emailError,
        );
      }
    }
  } catch (error) {
    Logger.error("Error in streak reminder check", error);
  }
};

/**
 * Check and send weekly goal progress reminders.
 * Runs every Monday.
 *
 * Logic:
 * - Find all active MonthlyGoals where completedLectures < targetLectures
 * - Send weekly progress email to each user
 */
const checkGoalReminders = async () => {
  try {
    const { istNow } = getISTStudyDate();
    const currentMonth = istNow.getMonth() + 1;
    const currentYear = istNow.getFullYear();

    const activeGoals = await MonthlyGoal.findAll({
      where: {
        month: currentMonth,
        year: currentYear,
        status: "Active",
      },
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "status"],
          where: { status: "Active" },
        },
      ],
    });

    Logger.info(
      `Goal reminder check: ${activeGoals.length} active goal(s) found`,
    );

    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = istNow.getDate();
    const daysRemaining = daysInMonth - currentDay;

    for (const goal of activeGoals) {
      if (goal.completedLectures >= goal.targetLectures) continue;

      try {
        const html = goalReminderTemplate(
          goal.User.name,
          goal.goalName,
          goal.completedLectures,
          goal.targetLectures,
          daysRemaining,
        );
        await sendEmail(
          goal.User.email,
          "🎯 Your Monthly Goal Progress Update",
          html,
        );
        Logger.info(`Goal reminder sent to ${goal.User.email}`);
      } catch (emailError) {
        Logger.error(
          `Failed to send goal reminder to ${goal.User.email}`,
          emailError,
        );
      }
    }
  } catch (error) {
    Logger.error("Error in goal reminder check", error);
  }
};

/**
 * Start the reminder scheduler.
 * - Streak reminders: checks every hour, sends at 3 PM IST
 * - Goal reminders: checks every hour, sends on Mondays at 10 AM IST
 */
const startReminderScheduler = () => {
  Logger.info("Starting email reminder scheduler...");

  // Check every hour
  setInterval(
    () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      const istHour = istNow.getUTCHours();
      const istDay = istNow.getUTCDay(); // 0=Sunday, 1=Monday

      // Streak reminder at 3 PM IST (15:00)
      if (istHour === 15) {
        Logger.info("Running streak reminder check (3 PM IST)");
        checkStreakReminders();
      }

      // Goal reminder on Mondays at 10 AM IST
      if (istDay === 1 && istHour === 10) {
        Logger.info("Running weekly goal reminder check (Monday 10 AM IST)");
        checkGoalReminders();
      }
    },
    60 * 60 * 1000,
  ); // Every hour
};

export { checkStreakReminders, checkGoalReminders, startReminderScheduler };
