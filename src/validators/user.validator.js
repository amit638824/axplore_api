/**
 * User Validation Schemas
 * Joi validation schemas for User management endpoints
 */

const Joi = require('joi');
const queryUserSchema = Joi.object({
   sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

const queryUserAddSchema = Joi.object({
   userId: Joi.string().uuid().optional(),
   travelAgencyId: Joi.string().uuid().required(),
   branchId: Joi.string().uuid().required(),
   designationId: Joi.string().uuid().required(),
   roleId: Joi.string().uuid().optional(),
   employeeCode: Joi.string().optional(),
   firstName: Joi.string().required(),
   lastName: Joi.string().required(),
   email: Joi.string().required(),
   mobile: Joi.string().optional(),
   isActive: Joi.boolean().optional(),
});

const queryUserDeleteSchema = Joi.object({
   userIds: Joi.array().items(Joi.string().uuid()).required(),
   isActive: Joi.boolean().required(),

});

module.exports = {
   queryUserSchema,
   queryUserAddSchema,
   queryUserDeleteSchema,
};
