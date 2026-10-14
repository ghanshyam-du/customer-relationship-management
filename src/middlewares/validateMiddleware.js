const { validationResult } = require('express-validator');

/**
 * Middleware to check express-validator validation results
 * Returns a 400 response with structured error messages if validation fails
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please correct the invalid fields.',
      errors: formattedErrors,
    });
  }

  next();
}

module.exports = {
  validateRequest,
};
