/**
 * Service Category Validation Schemas
 */

const Joi = require('joi');

const queryServiceCategorySchema = Joi.object({
  isActive: Joi.boolean().optional(),
  search: Joi.string().max(100).optional(),
});

const createServiceCategorySchema = Joi.object({
  categoryCode: Joi.string().trim().min(1).max(50).required(),
  categoryName: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().max(2000).optional().allow('', null),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

const updateServiceCategorySchema = Joi.object({
  categoryCode: Joi.string().trim().min(1).max(50).optional(),
  categoryName: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().max(2000).optional().allow('', null),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = {
  queryServiceCategorySchema,
  createServiceCategorySchema,
  updateServiceCategorySchema,
};
