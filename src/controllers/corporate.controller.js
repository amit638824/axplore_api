/**
 * Client Corporate Controller
 * Handles HTTP requests for Client Corporate management endpoints
 */

const CorporateService = require('../services/corporate.service.js');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get Client Corporate
 */
const getCorporate = asyncHandler(async (req, res) => {
  const Corporate = await CorporateService.getCorporate();
  return success(res, Corporate, 'Client Corporate retrieved successfully');
});


/**
* Get add Corporate
*/
const addCorporate = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  console.log("req.body", req.body);
  console.log("req.file", req.file);
  const Corporate = await CorporateService.addCorporate(req.body, userId, req.file);
  return success(res, Corporate, 'Corporate added/updated successfully');
});

/**
 * Get Client Corporates List
 */
const getCorporatesList = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 1000;
  const search = req.query.search || undefined;
  const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;
  const corporates = await CorporateService.getCorporatesList({ page, limit, search, isActive });
  return paginated(res, corporates, 'Client Corporates retrieved successfully');
});

/**
 * Update Corporate Status
 */
const updateCorporateStatus = asyncHandler(async (req, res) => {
  const corporate = await CorporateService.updateCorporateStatus(req.body);
  return success(res, corporate, 'Corporate status updated successfully');
});



const addContactPerson = asyncHandler(async (req, res) => {
  const contactPerson = await CorporateService.addContactPerson(req.body);
  return success(res, contactPerson, 'Contact Person added/updated successfully');
});

const deleteContactPerson = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);
  const contactPerson = await CorporateService.deleteContactPerson(req.body);
  return success(res, contactPerson, 'Contact Person deleted successfully');
});


const getContactPersonList = asyncHandler(async (req, res) => {
  const divisionId = req.query.divisionId;
  const subDivisionId = req.query.subDivisionId;
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 1000;
  const search = req.query.search || undefined;
  const contactPerson = await CorporateService.getContactPersonList({ divisionId, subDivisionId, page, limit, search });
  return paginated(res, contactPerson, 'Contact Person list retrieved successfully');
});


module.exports = {
  getCorporate,
  addCorporate,
  getCorporatesList,
  updateCorporateStatus,
  addContactPerson,
  deleteContactPerson,
  getContactPersonList,
};