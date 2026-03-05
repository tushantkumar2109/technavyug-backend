import mongoose from "mongoose";

import app from "./app.js";
import Logger from "./utils/logger.js";

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    Logger.info("Connected to MongoDB");

    app.listen(PORT, () => {
      Logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    Logger.error("Database connection failed:", err);
    process.exit(1); // Exit process on database connection failure
  });
