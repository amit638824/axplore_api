/**
 * City Validation Schemas
 * Joi validation schemas for City management endpoints
 */

const Joi = require('joi');
const queryCitySchema = Joi.object({
   sortOrder: Joi.string().valid('asc', 'desc').optional(),
});


const createCitySchema = Joi.object({
  countryId: Joi.string().uuid().required(),
  stateId: Joi.string().uuid().optional().allow(null, ''),
  name: Joi.string().trim().min(1).max(200).required(),
  timezone: Joi.string().trim().max(100).optional().allow('', null),
  timezone_gmt: Joi.string().trim().max(10).optional().allow('', null),
  city_image: Joi.string().optional().allow('', null),
  city_description: Joi.string().optional().allow('', null),
});

const updateCitySchema = Joi.object({
  countryId: Joi.string().uuid().optional().allow(null, ''),
  stateId: Joi.string().uuid().optional().allow(null, ''),
  name: Joi.string().trim().min(1).max(200).optional(),
  timezone: Joi.string().trim().max(100).optional().allow('', null),
  timezone_gmt: Joi.string().trim().max(10).optional().allow('', null),
  city_image: Joi.string().optional().allow('', null),
  city_description: Joi.string().optional().allow('', null),
});




module.exports = {
   queryCitySchema,
   createCitySchema,
   updateCitySchema
};
