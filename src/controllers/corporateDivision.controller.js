/**
 * Division Controller
 * Handles HTTP requests for  Division management endpoints
 */

const corporateDivisionService = require('../services/corporateDivision.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get  Division
 */
const getDivisionList = asyncHandler(async (req, res) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 1000;
  const search = req.query.search || undefined;
  const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;
  const divisions = await corporateDivisionService.getDivisionList({ page, limit, search, isActive });
  return success(res, divisions, 'Corporate  Division retrieved successfully');
});

/**
* Get add Corporate
*/
const addDivision = asyncHandler(async (req, res) => {
  const division = await corporateDivisionService.addDivision(req.body);
  return success(res, division, 'Corporate Division added/updated successfully');
});

const updateDivision = asyncHandler(async (req, res) => {
  const division = await corporateDivisionService.updateDivisionStatus(req.body);
  return success(res, division, 'Corporate Division status updated successfully');
});

module.exports = {
  getDivisionList,
  addDivision,
  updateDivision,
};
