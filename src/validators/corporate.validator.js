/**
 * Lead Status Validation Schemas
 * Joi validation schemas for Lead Status management endpoints
 */

const Joi = require('joi');
const querycorporateSchema = Joi.object({
   createdAt: Joi.string().valid('asc', 'desc').optional(),
});



const addCorporateSchema = Joi.object({
   corporateId: Joi.string().optional(),
   corporateCode: Joi.string().optional().allow(null, ""),
   corporateName: Joi.string().required(),
   websiteUrl: Joi.string().optional().allow(null, ""),
   isActive: Joi.boolean().optional(),
   gstin: Joi.string().max(15).optional().allow(null, ""),
   pan: Joi.string().max(10).optional().allow(null, ""),
   companySize: Joi.string().optional().allow(null, ""),
   companyVertical: Joi.string().optional().allow(null, ""),
   companyDescription: Joi.string().optional().allow(null, ""),
   facebookUrl: Joi.string().optional().allow(null, ""),
   linkedinUrl: Joi.string().optional().allow(null, ""),
   twitterUrl: Joi.string().optional().allow(null, ""),
   folder: Joi.string().optional().allow(null, ""),
});





const statusCorporateSchema = Joi.object({
   corporateIds: Joi.array().items(Joi.string().uuid().required()).min(1).required(),
   isActive: Joi.boolean().required(),
});

const addContactPersonSchema = Joi.object({
   contactPersonId: Joi.string().optional(),
   corporateId: Joi.string().uuid().required(),
   divisionId: Joi.string().uuid().optional().allow(null, ""),
   subDivisionId: Joi.string().uuid().optional().allow(null, ""),
   firstName: Joi.string().required(),
   lastName: Joi.string().optional().allow(null, ""),
   designation: Joi.string().optional().allow(null, ""),
   email: Joi.string().email().optional().allow(null, ""),
   mobile: Joi.string().required(),
   alternateMobile: Joi.string().optional().allow(null, ""),
   isActive: Joi.boolean().optional(),
   location: Joi.string().max(150).optional().allow(null, ""),
   isPrimary: Joi.boolean().optional(),
   gender: Joi.string().valid('Male', 'Female', 'Other').optional().allow(null, ""),
   dob: Joi.date().optional().allow(null, ""),
});


const deleteContactPersonSchema = Joi.object({
   contactPersonIds: Joi.array().items(Joi.string().uuid().required()).min(1).required(),
   isActive: Joi.boolean().required(),
});

module.exports = {
   querycorporateSchema,
   addCorporateSchema,
   statusCorporateSchema,
   addContactPersonSchema,
   deleteContactPersonSchema,
};
