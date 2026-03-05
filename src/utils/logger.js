const isProduction = process.env.NODE_ENV === "production";

class Logger {
  static info(message, data = null) {
    if (!isProduction) {
      console.log(`INFO: ${message}`);
      if (data) console.log(data);
    }
  }

  static success(message, data = null) {
    if (!isProduction) {
      console.log(`SUCCESS: ${message}`);
      if (data) console.log(data);
    }
  }

  static warn(message, data = null) {
    if (!isProduction) {
      console.warn(`WARNING: ${message}`);
      if (data) console.warn(data);
    }
  }

  static error(message, error = null) {
    // Always log erros, even in production
    console.error(`ERROR: ${message}`);
    if (error) console.error(error);
  }

  static debug(message, data = null) {
    if (!isProduction) {
      console.debug(`DEBUG: ${message}`);
      if (data) console.debug(data);
    }
  }
}

export default Logger;
