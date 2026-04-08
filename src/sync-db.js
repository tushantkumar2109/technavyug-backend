import "dotenv/config";
import { sequelize } from "./models/index.js";
import Logger from "./utils/logger.js";

const syncDB = async () => {
  try {
    Logger.info("Starting safe database sync...");
    await sequelize.authenticate();
    Logger.info("Connected to Database.");

    // Instead of forcing or blindly syncing, we use alter: true
    // to match the database tables with models without dropping existing data.
    // In production, migrations are usually preferred, but for a safe controlled sync:
    await sequelize.sync({ alter: true });

    Logger.info("Database synchronized successfully.");
    process.exit(0);
  } catch (error) {
    Logger.error("Failed to sync database:", error);
    process.exit(1);
  }
};

syncDB();
