import "dotenv/config";

import app from "./app.js";
import { sequelize } from "./models/index.js";
import Logger from "./utils/logger.js";
import { startReminderScheduler } from "./services/reminderScheduler.js";

const PORT = process.env.PORT || 5000;

// Connect to MySQL and sync models (tables)
sequelize
  .sync({ alter: true })
  .then(() => {
    Logger.info("Connected to MySQL Database");

    const server = app.listen(PORT, 'localhost', () => {
      Logger.info(`Server running on port ${PORT}`);
    });
    // Increased timeout for large video uploads (10 minutes)
    server.timeout = 600000;
    server.keepAliveTimeout = 65000;

    // Start email reminder scheduler (streak + goal reminders)
    startReminderScheduler();
  })
  .catch((err) => {
    Logger.error("Database connection failed:", err);
    process.exit(1);
  });
