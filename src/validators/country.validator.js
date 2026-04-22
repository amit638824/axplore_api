/**
 * Country Validation Schemas
 * Joi validation schemas for Country management endpoints
 */

const Joi = require('joi');

const queryCountrySchema = Joi.object({
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

const createCountrySchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  isoCode: Joi.string().trim().max(10).optional().allow('', null),
  iso3: Joi.string().trim().max(3).optional().allow('', null),
  dial_code: Joi.string().trim().max(10).optional().allow('', null),
  currency_code: Joi.string().trim().max(500).optional().allow('', null),
  currency_symbol: Joi.string().trim().max(10).optional().allow('', null),
  time_zone: Joi.string().trim().max(50).optional().allow('', null),
  region: Joi.string().trim().max(100).optional().allow('', null),
  sub_region: Joi.string().trim().max(100).optional().allow('', null),
  language: Joi.string().trim().max(500).optional().allow('', null),
  country_description: Joi.string().optional().allow('', null),
  places_to_visit: Joi.string().optional().allow('', null),
  website: Joi.string().trim().max(300).optional().allow('', null),
  is_active: Joi.boolean().optional(),
});

const updateCountrySchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  isoCode: Joi.string().trim().max(10).optional().allow('', null),
  iso3: Joi.string().trim().max(3).optional().allow('', null),
  dial_code: Joi.string().trim().max(10).optional().allow('', null),
  currency_code: Joi.string().trim().max(500).optional().allow('', null),
  currency_symbol: Joi.string().trim().max(10).optional().allow('', null),
  time_zone: Joi.string().trim().max(50).optional().allow('', null),
  region: Joi.string().trim().max(100).optional().allow('', null),
  sub_region: Joi.string().trim().max(100).optional().allow('', null),
  language: Joi.string().trim().max(500).optional().allow('', null),
  country_description: Joi.string().optional().allow('', null),
  places_to_visit: Joi.string().optional().allow('', null),
  website: Joi.string().trim().max(300).optional().allow('', null),
  is_active: Joi.boolean().optional(),
});



module.exports = {
  queryCountrySchema,
  createCountrySchema,
  updateCountrySchema,
};

