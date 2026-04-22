/**
 * Pickup Hub Validation Schemas
 */

const Joi = require('joi');

const queryPickupHubSchema = Joi.object({
  cityId: Joi.string().uuid().optional(),
  type: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});

const createPickupHubSchema = Joi.object({
  city_id: Joi.string().uuid().required(),
  hub_code_iata: Joi.string().trim().length(3).required(),
  hub_code_icao: Joi.string().trim().max(4).optional().allow('', null),
  hub_name: Joi.string().trim().min(1).max(150).required(),
  hub_type: Joi.string().optional().default('AIRPORT'),
  airport_category: Joi.string().valid('INTERNATIONAL', 'DOMESTIC').optional().default('INTERNATIONAL'),
  terminal_count: Joi.number().integer().min(0).optional().allow(null),
  timezone: Joi.string().trim().max(50).optional().allow('', null),
  latitude: Joi.number().optional().allow(null),
  longitude: Joi.number().optional().allow(null),
  is_default: Joi.boolean().optional().default(false),
  is_active: Joi.boolean().optional().default(true),
});

const updatePickupHubSchema = Joi.object({
  city_id: Joi.string().uuid().optional(),
  hub_code_iata: Joi.string().trim().length(3).optional(),
  hub_code_icao: Joi.string().trim().max(4).optional().allow('', null),
  hub_name: Joi.string().trim().min(1).max(150).optional(),
  hub_type: Joi.string().optional(),
  airport_category: Joi.string().valid('INTERNATIONAL', 'DOMESTIC').optional(),
  terminal_count: Joi.number().integer().min(0).optional().allow(null),
  timezone: Joi.string().trim().max(50).optional().allow('', null),
  latitude: Joi.number().optional().allow(null),
  longitude: Joi.number().optional().allow(null),
  is_default: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
});

module.exports = {
  queryPickupHubSchema,
  createPickupHubSchema,
  updatePickupHubSchema,
};
