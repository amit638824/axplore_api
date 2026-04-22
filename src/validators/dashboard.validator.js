/**
 * City Validation Schemas
 * Joi validation schemas for City management endpoints
 */

const Joi = require('joi');
const queryDashboardSchema = Joi.object({
   sortOrder: Joi.string().valid('asc', 'desc').optional(),
});



module.exports = {
   queryDashboardSchema
};
