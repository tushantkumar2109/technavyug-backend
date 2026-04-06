/**
 * One-time migration: Adds 'Service' to Products.type ENUM
 * Run once with: node src/migrations/add_service_type_to_products.js
 */
import sequelize from "../config/db.js";

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database.");

    await sequelize.query(`
      ALTER TABLE Products 
      MODIFY COLUMN type ENUM('Physical', 'Digital', 'Service') NOT NULL DEFAULT 'Physical'
    `);

    console.log("✅ Migration done: 'Service' added to Products.type ENUM");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();
