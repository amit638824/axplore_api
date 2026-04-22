/**
 * State Validation Schemas
 */

const Joi = require('joi');

const queryStateSchema = Joi.object({
  countryId: Joi.string().uuid().optional(),
});

const createStateSchema = Joi.object({
  countryId: Joi.string().uuid().required(),
  name: Joi.string().trim().min(1).max(200).required(),
});

const updateStateSchema = Joi.object({
  countryId: Joi.string().uuid().optional(),
  name: Joi.string().trim().min(1).max(200).optional(),
});

module.exports = {
  queryStateSchema,
  createStateSchema,
  updateStateSchema,
};
