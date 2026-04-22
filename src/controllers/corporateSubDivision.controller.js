/**
 * Sub Division Controller
 * Handles HTTP requests for Sub Division management endpoints
 */

const corporateSubDivisionService = require('../services/corporateSubDivision.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get Sub Division with details
 */
const getCorporateSubDivisionById = asyncHandler(async (req, res) => {
  const { divisionId = "null" } = req.params;
  const CorporateSubDivision = await corporateSubDivisionService.getCorporateSubDivisionById(divisionId);
  return success(res, CorporateSubDivision, 'Corporate Sub Division retrieved successfully');
});



/**
 * Get Sub Division only sub division
 */
const getSubDivisionById = asyncHandler(async (req, res) => {
  const { divisionId = "null" } = req.params;
  const subDivision = await corporateSubDivisionService.getSubDivisionById(divisionId);
  return success(res, subDivision, 'Sub Division retrieved successfully');
});



/**
* Get add Corporate Sub division
*/
const addSubDivision = asyncHandler(async (req, res) => {
  const subdivision = await corporateSubDivisionService.addSubDivision(req.body);
  return success(res, subdivision, 'Corporate Sub Division added/updated successfully');
});

/**
 * Delete Sub Division
 */
const deleteSubDivision = asyncHandler(async (req, res) => {
  const subdivision = await corporateSubDivisionService.deleteSubDivision(req.body);
  return success(res, subdivision, 'Corporate Sub Division deleted successfully');
});


// corporate sub division address
const subDivisionAddress = asyncHandler(async (req, res) => {
  const subdivision = await corporateSubDivisionService.subDivisionAddress(req.body);
  return success(res, subdivision, 'Corporate Sub Division Address added/updated successfully');
});


// get sub division address list
const subDivisionAddressList = asyncHandler(async (req, res) => {
  const divisionId = req.query.divisionId;
  const subDivisionId = req.query.subDivisionId;
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10000;
  const search = req.query.search || undefined;
  const subdivisionAddtessList = await corporateSubDivisionService.subDivisionAddressList({ divisionId, subDivisionId, page, limit, search });
  return success(res, subdivisionAddtessList, 'Corporate Sub Division Address list retrieved successfully');
});

module.exports = {
  getCorporateSubDivisionById,
  addSubDivision,
  deleteSubDivision,
  subDivisionAddress,
  subDivisionAddressList,
  getSubDivisionById,
};
