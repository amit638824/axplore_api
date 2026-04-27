const Joi = require('joi');

/**
 * SOS Trigger Validation Schema
 */
const triggerSosSchema = Joi.object({
  paxId: Joi.string()
    .uuid()
    .optional()
    .allow(null, '')
    .messages({
      'string.guid': 'paxId must be a valid UUID',
    }),


  tripId: Joi.string()
    .uuid()
    .optional()
    .allow(null, '')
    .messages({
      'string.guid': 'tripId must be a valid UUID',
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

  typeofemergency: Joi.string()
    .required()
    .messages({
      'any.required': 'typeofemergency is required',
    }),

});


module.exports = {
  triggerSosSchema,
};
