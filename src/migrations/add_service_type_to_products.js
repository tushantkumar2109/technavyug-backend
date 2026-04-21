import sequelize from "../config/db.js";
import Logger from "../utils/logger.js";

async function migrate() {
  try {
    await sequelize.authenticate();
    Logger.info("Connected to MySQL Database for migration");

    await sequelize.query(`
      ALTER TABLE Products 
      MODIFY COLUMN type ENUM('Physical', 'Digital', 'Service') NOT NULL DEFAULT 'Physical'
    `);

    Logger.info("Migration done: 'Service' added to Products.type ENUM");
    process.exit(0);
  } catch (error) {
    Logger.error("Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();
