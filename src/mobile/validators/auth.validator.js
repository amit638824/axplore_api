const Joi = require('joi');

/**
 * Mobile Auth Validation Schemas
 */

const registrationSchema = Joi.object({
  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Mobile number must be between 10 to 15 digits',
      'any.required': 'mobileNumber is required',
    }),
  
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'any.required': 'firstName is required',
    }),
    
  middleName: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow(null, ''),
    
  lastName: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow(null, ''),
    
  emailAddress: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'emailAddress is required',
    }),
    
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'password is required',
    }),
    
  gender: Joi.string()
    .valid('Male', 'Female', 'Other')
    .optional()
    .allow(null, ''),
    
  dob: Joi.string()
    .pattern(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(19|20)\d\d$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'DOB must be in dd/mm/yyyy format',
    }),
});

module.exports = {
  registrationSchema,
  mobileVerificationSchema: Joi.object({
    mobileNumber: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .required()
      .messages({
        'string.pattern.base': 'Mobile number must be between 10 to 15 digits',
        'any.required': 'mobileNumber is required',
      }),
  }),
  emailVerificationSchema: Joi.object({
    emailAddress: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'emailAddress is required',
      }),
  }),
  otpVerificationSchema: Joi.object({
    mobileNumber: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .optional()
      .allow(null, ''),
    emailAddress: Joi.string()
      .email()
      .optional()
      .allow(null, ''),
    otp: Joi.string()
      .length(6)
      .required()
      .messages({
        'string.length': 'OTP must be 6 digits',
        'any.required': 'otp is required',
      }),
  }).or('mobileNumber', 'emailAddress'),
  loginSchema: Joi.object({
    emailAddress: Joi.string()
      .email()
      .optional()
      .allow(null, ''),
    mobile: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .optional()
      .allow(null, ''),
    countryCode: Joi.string()
      .optional()
      .allow(null, ''),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'password is required',
      }),
    deviceId: Joi.string()
      .required()
      .messages({
        'any.required': 'deviceId is required',
      }),
    deviceName: Joi.string().optional(),
    deviceType: Joi.string().optional(),
    fcmtoken: Joi.string().optional(),
  }).or('emailAddress', 'mobile'),
};
