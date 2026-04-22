const Joi = require('joi');

/**
 * SOS Trigger Validation Schema
 */
const triggerSosSchema = Joi.object({
  paxId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'paxId must be a valid UUID',
      'any.required': 'paxId is required',
    }),
    
  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Mobile number must be between 10 to 15 digits',
      'any.required': 'mobileNumber is required',
    }),
    
  latitude: Joi.string()
    .required()
    .messages({
      'any.required': 'latitude is required',
    }),
    
  longitude: Joi.string()
    .required()
    .messages({
      'any.required': 'longitude is required',
    }),
    
  locationName: Joi.string()
    .trim()
    .max(255)
    .optional()
    .allow(null, ''),
});

module.exports = {
  triggerSosSchema,
};
