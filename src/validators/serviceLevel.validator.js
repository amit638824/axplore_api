/**
 * Service Level Validation Schemas
 */

const Joi = require('joi');

const queryServiceLevelSchema = Joi.object({
  isActive: Joi.boolean().optional(),
});

const createServiceLevelSchema = Joi.object({
  levelCode: Joi.string().trim().min(1).max(50).required(),
  levelName: Joi.string().trim().min(1).max(200).required(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

const updateServiceLevelSchema = Joi.object({
  levelCode: Joi.string().trim().min(1).max(50).optional(),
  levelName: Joi.string().trim().min(1).max(200).optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = {
  queryServiceLevelSchema,
  createServiceLevelSchema,
  updateServiceLevelSchema,
};
