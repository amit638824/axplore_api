/**
 * Designation Validation Schemas
 */

const Joi = require('joi');

const queryDesignationSchema = Joi.object({
  isActive: Joi.boolean().optional(),
});

const createDesignationSchema = Joi.object({
  designationCode: Joi.string().trim().min(1).max(50).required(),
  designationName: Joi.string().trim().min(1).max(200).required(),
  isActive: Joi.boolean().optional(),
});

const updateDesignationSchema = Joi.object({
  designationCode: Joi.string().trim().min(1).max(50).optional(),
  designationName: Joi.string().trim().min(1).max(200).optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = {
  queryDesignationSchema,
  createDesignationSchema,
  updateDesignationSchema,
};
