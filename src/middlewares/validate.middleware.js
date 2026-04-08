import { validationResult } from "express-validator";

// Middleware to catch express-validator errors
export default (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    return res.status(422).json({
      errors: errorArray,
      message: errorArray[0].msg || "Validation error",
    });
  }
  next();
};
