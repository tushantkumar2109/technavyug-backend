import "dotenv/config";

import app from "./app.js";
import { sequelize } from "./models/index.js";
import Logger from "./utils/logger.js";
import { startReminderScheduler } from "./services/reminderScheduler.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    Logger.info("Connected to MySQL Database");

    const server = app.listen(PORT, "0.0.0.0", () => {
      Logger.info(`Server running on port ${PORT}`);
    });

    server.timeout = 600000;
    server.keepAliveTimeout = 65000;

    startReminderScheduler();
  } catch (err) {
    Logger.error("Database connection failed:", err);
    process.exit(1);
  }
};

startServer();
