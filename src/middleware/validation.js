/**
 * Validation Middleware
 * Validates request data using Joi schemas
 */

const { ValidationError } = require('../utils/errors');

/**
 * Validate request data against Joi schema
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ValidationError('Validation failed', errors);
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

module.exports = {
  validate,
};
