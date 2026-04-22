/**
 * Lead Validation Schemas
 * Joi validation schemas for lead management endpoints
 */

const Joi = require('joi');
const querySegmentSchema = Joi.object({
   sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

module.exports = {
   querySegmentSchema,
};
