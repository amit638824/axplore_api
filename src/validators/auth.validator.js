/**
 * Authentication Validation Schemas
 * Joi validation schemas for authentication endpoints
 */

const Joi = require('joi');
const { PASSWORD } = require('../config/constants');

const loginSchema = Joi.object({
  // email: Joi.string().email().required().messages({
  //   //'string.email': 'Please provide a valid email address',
  //   'any.required': 'Email is required',
  // }),

  email: Joi.string().trim().required().messages({
    'string.empty': 'Email cannot be empty',
    'any.required': 'Email is required',
  }),

  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
  deviceId: Joi.string().optional(),
  deviceType: Joi.string().valid('web', 'mobile', 'tablet').optional(),
  deviceName: Joi.string().optional(),
  appVersion: Joi.string().optional(),
});

const registerSchema = Joi.object({
  travelAgencyId: Joi.string().uuid().required(),
  branchId: Joi.string().uuid().required(),
  designationId: Joi.string().uuid().required(),
  employeeCode: Joi.string().optional(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().required(),
  mobile: Joi.string().pattern(/^[0-9]{10}$/).optional(),
  password: Joi.string()
    .min(PASSWORD.MIN_LENGTH)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': `Password must be at least ${PASSWORD.MIN_LENGTH} characters long`,
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(PASSWORD.MIN_LENGTH)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': `Password must be at least ${PASSWORD.MIN_LENGTH} characters long`,
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().required(), // Relaxed from .email() to allow other identifiers if needed
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string()
    .min(PASSWORD.MIN_LENGTH)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required(),
});

module.exports = {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
