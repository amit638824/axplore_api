/**
 * Service Level Controller
 * Handles HTTP requests for Master ServiceLevel CRUD endpoints
 */

const serviceLevelService = require('../services/serviceLevel.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

const getServiceLevels = asyncHandler(async (req, res) => {
  const data = await serviceLevelService.getServiceLevels(req.query);
  return success(res, data, 'Service levels retrieved successfully');
});

const getServiceLevelById = asyncHandler(async (req, res) => {
  const data = await serviceLevelService.getServiceLevelById(req.params.serviceLevelId);
  return success(res, data, 'Service level retrieved successfully');
});

const createServiceLevel = asyncHandler(async (req, res) => {
  const data = await serviceLevelService.createServiceLevel(req.body);
  return success(res, data, 'Service level created successfully', 201);
});

const updateServiceLevel = asyncHandler(async (req, res) => {
  const data = await serviceLevelService.updateServiceLevel(req.params.serviceLevelId, req.body);
  return success(res, data, 'Service level updated successfully');
});

const deleteServiceLevel = asyncHandler(async (req, res) => {
  await serviceLevelService.deleteServiceLevel(req.params.serviceLevelId);
  return success(res, null, 'Service level deactivated successfully');
});

module.exports = {
  getServiceLevels,
  getServiceLevelById,
  createServiceLevel,
  updateServiceLevel,
  deleteServiceLevel,
};
