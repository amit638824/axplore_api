/**
 * Role Validation Schemas
 * Joi validation schemas for Role management endpoints
 */

const Joi = require('joi');
const queryRoleSchema = Joi.object({
   sortOrder: Joi.string().valid('asc', 'desc').optional(),
});


const createRoleSchema = Joi.object({
    roleId : Joi.string().uuid().required(),
    name: Joi.string().trim().min(1).max(200).required(),
});


const updateRoleSchema = Joi.object({
  roleId : Joi.string().uuid().required(), 
  name: Joi.string().trim().min(1).max(200).optional(),
 });


module.exports = {
   queryRoleSchema,
   createRoleSchema,
   updateRoleSchema
};
