/**
 * Sub division Validation Schemas
 * Joi schemas for Sub division management endpoints
 */

const Joi = require('joi');
const queryCorporateSubDivisionSchema = Joi.object({
   sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

const addSubDivisionSchema = Joi.object({
   subDivisionId: Joi.string().uuid().optional(),
   divisionId: Joi.string().uuid().required(),
   subDivisionCode: Joi.string().optional().allow(null, ""),
   subDivisionName: Joi.string().required(),
   websiteUrl: Joi.string().optional().allow(null, ""),
   isActive: Joi.boolean().optional().default(true),
});

const deleteSubDivisionSchema = Joi.object({
   subDivisionIds: Joi.array().items(Joi.string().uuid()).required(),
   isActive: Joi.boolean().required(),
});


const addressSubDivisionSchema = Joi.object({
   subDivisionAddressId: Joi.string().uuid().optional(),
   subDivisionId: Joi.string().uuid().required(),
   addressLine1: Joi.string().required(),
   addressLine2: Joi.string().optional().allow(null, ""),
   cityId: Joi.string().uuid().required(),
   stateId: Joi.string().uuid().required(),
   countryId: Joi.string().uuid().required(),
   postalCode: Joi.string().optional().allow(null, ""),
   isPrimary: Joi.boolean().optional(),
   corporateId: Joi.string().uuid().required(),
   divisionId: Joi.string().uuid().required(),
   isActive: Joi.boolean().optional().default(true),
});

module.exports = {
   queryCorporateSubDivisionSchema,
   addSubDivisionSchema,
   deleteSubDivisionSchema,
   addressSubDivisionSchema,
};

