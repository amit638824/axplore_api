/**
 * Division Validation Schemas
 * Joi validation schemas for Division management endpoints
 */

const Joi = require('joi');
const queryCorporateDivisionSchema = Joi.object({
   sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

const addCorporateDivisionSchema = Joi.object({
   divisionId: Joi.string().uuid().optional(),
   corporateId: Joi.string().uuid().required(),
   divisionCode: Joi.string().optional().allow(null, ""),
   divisionName: Joi.string().required(),
   isActive: Joi.boolean().optional().default(true),
});


const updateDivisionStatusSchema = Joi.object({
   divisionIds: Joi.array().items(Joi.string().uuid()).required(),
   isActive: Joi.boolean().required(),
});


module.exports = {
   queryCorporateDivisionSchema,
   addCorporateDivisionSchema,
   updateDivisionStatusSchema,
};
