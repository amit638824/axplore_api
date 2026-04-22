/**
 * Costsheet Validation Schemas
 * Joi validation schemas for Costsheet management endpoints
 */

const Joi = require('joi');
const queryCostsheetSchema = Joi.object({
   sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

const queryCostsheetSchemaById = Joi.object({
   sortOrder: Joi.string().valid('asc', 'desc').optional(),
   costsheetTemplateId: Joi.string().uuid().required(),
});





const queryAddCostsheetSchema = Joi.object({
   leadCostsheetId: Joi.string().uuid().optional(),
   costsheetTemplateId: Joi.string().uuid().allow(null, '').optional(),
   leadId: Joi.string().uuid().required(),
   optionNo: Joi.number().integer().optional(),
   templateSnapshot: Joi.any().allow(null, '', {}).optional(),
   sheetData: Joi.any().allow(null, '', {}).optional(),
   totalCost: Joi.number().precision(2).allow(null, ''),
   sellingPrice: Joi.number().precision(2).allow(null, ''),
   totalGop: Joi.number().precision(2).allow(null, '', 0),
   gopPerson: Joi.number().precision(2).allow(null, '', 0),
   margin: Joi.boolean().allow(null, '', 0),
   createdBy: Joi.string().uuid().allow(null, ''),
   costSheetType: Joi.string().max(20).allow(null, ''),
   uploadedFilePath: Joi.string().allow(null, ''),
});

const queryUpdateCostsheetSchema = Joi.object({
   leadCostsheetId: Joi.string().uuid().optional(),
   costsheetTemplateId: Joi.string().uuid().allow(null, '').optional(),
   leadId: Joi.string().uuid().required(),
   optionNo: Joi.number().integer().optional(),
   templateSnapshot: Joi.any().allow(null, '', {}).optional(),
   sheetData: Joi.any().allow(null, '', {}).optional(),
   totalCost: Joi.number().precision(2).allow(null, ''),
   sellingPrice: Joi.number().precision(2).allow(null, ''),
   totalGop: Joi.number().precision(2).allow(null, '', 0),
   gopPerson: Joi.number().precision(2).allow(null, '', 0),
   margin: Joi.boolean().allow(null, '', 0),
   modifiedBy: Joi.string().uuid().required(),
   costSheetType: Joi.string().max(20).allow(null, ''),
   uploadedFilePath: Joi.string().allow(null, ''),
});

const deactivateCostsheetSchema = Joi.object({
   leadCostsheetId: Joi.string().uuid().required(),
   modifiedBy: Joi.string().uuid().optional(),
});



module.exports = {
   queryCostsheetSchema,
   queryAddCostsheetSchema,
   queryUpdateCostsheetSchema,
   queryCostsheetSchemaById,
   deactivateCostsheetSchema,

};
