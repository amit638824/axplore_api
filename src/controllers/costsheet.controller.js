/**
 * Costsheet Controller
 * Handles HTTP requests for Costsheet management endpoints
 */

const costsheetService = require('../services/costsheet.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get Costsheet
 */
const getCostsheet = asyncHandler(async (req, res) => {
  const costsheet = await costsheetService.getCostsheet(req.body);
  return success(res, costsheet, 'Cost Sheet retrieved successfully');
});

/**
 * Get Costsheet by id
 */
const getCostsheetById = asyncHandler(async (req, res) => {
  const costsheet = await costsheetService.getCostsheetById(req.body);
  return success(res, costsheet, 'Cost Sheet retrieved successfully');
});



/**
 * Add/Update Costsheet
 */
const addCostsheet = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.userId;
  const data = { 
    ...req.body, 
    createdBy: req.body.createdBy || userId,
    modifiedBy: req.body.modifiedBy || userId 
  };
  const costsheet = await costsheetService.addCostsheet(data, req.file);
  return success(res, costsheet, 'Cost Sheet added/updated successfully');
});

/**
 * Deactivate Costsheet
 */
const deactivateCostsheet = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.userId;
  const data = {
    ...req.body,
    modifiedBy: userId,
  };
  const costsheet = await costsheetService.deactivateCostsheet(data);
  return success(res, costsheet, 'Cost Sheet deactivated successfully');
});

module.exports = {
  getCostsheet,
  getCostsheetById,
  addCostsheet,
  deactivateCostsheet,
};

