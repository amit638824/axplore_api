/**
 * Lead Status Validation Schemas
 * Joi validation schemas for Lead Status management endpoints
 */

const Joi = require('joi');
const queryLeadStatusSchema = Joi.object({
   sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

module.exports = {
   queryLeadStatusSchema,
};
