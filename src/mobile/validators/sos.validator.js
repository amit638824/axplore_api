const Joi = require('joi');

/**
 * SOS Trigger Validation Schema
 */
const triggerSosSchema = Joi.object({
  paxID: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'paxID must be a string',
    }),

  paxId: Joi.string()
    .optional()
    .allow(null, ''),
    
  mobileNumber: Joi.string()
    .allow(null, '')
    .optional(),
    
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
