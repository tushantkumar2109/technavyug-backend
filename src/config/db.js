import { Sequelize } from "sequelize";
import "dotenv/config";

const isTest = process.env.NODE_ENV === "test";

const sequelize = isTest
  ? new Sequelize("sqlite::memory:", { logging: false })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        dialect: "mysql",
        logging: false,
      },
    );

export default sequelize;
