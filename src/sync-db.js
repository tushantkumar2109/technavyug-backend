import "dotenv/config";
import { sequelize } from "./models/index.js";
import Logger from "./utils/logger.js";

const syncDB = async () => {
  try {
    Logger.info("Starting safe database sync...");
    await sequelize.authenticate();
    Logger.info("Connected to Database.");

    await sequelize.sync({ alter: true });

    Logger.info("Database synchronized successfully.");
    process.exit(0);
  } catch (error) {
    Logger.error("Failed to sync database:", error);
    process.exit(1);
  }
};

syncDB();
