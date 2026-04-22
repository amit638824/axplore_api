/**
 * Service Type Validation Schemas
 */

const Joi = require('joi');

const queryServiceTypeSchema = Joi.object({
  serviceCategoryId: Joi.string().uuid().optional(),
  isActive: Joi.boolean().optional(),
});

const createServiceTypeSchema = Joi.object({
  serviceCategoryId: Joi.string().uuid().required(),
  serviceTypeCode: Joi.string().trim().min(1).max(50).required(),
  serviceTypeName: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().max(2000).optional().allow('', null),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

const updateServiceTypeSchema = Joi.object({
  serviceCategoryId: Joi.string().uuid().optional(),
  serviceTypeCode: Joi.string().trim().min(1).max(50).optional(),
  serviceTypeName: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().max(2000).optional().allow('', null),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = {
  queryServiceTypeSchema,
  createServiceTypeSchema,
  updateServiceTypeSchema,
};
