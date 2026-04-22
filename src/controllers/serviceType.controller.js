/**
 * Service Type Controller
 * Handles HTTP requests for Master ServiceType CRUD endpoints
 */

const serviceTypeService = require('../services/serviceType.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

const getServiceTypes = asyncHandler(async (req, res) => {
  const data = await serviceTypeService.getServiceTypes(req.query);
  return success(res, data, 'Service types retrieved successfully');
});

const getServiceTypeById = asyncHandler(async (req, res) => {
  const data = await serviceTypeService.getServiceTypeById(req.params.serviceTypeId);
  return success(res, data, 'Service type retrieved successfully');
});

const createServiceType = asyncHandler(async (req, res) => {
  const data = await serviceTypeService.createServiceType(req.body);
  return success(res, data, 'Service type created successfully', 201);
});

const updateServiceType = asyncHandler(async (req, res) => {
  const data = await serviceTypeService.updateServiceType(req.params.serviceTypeId, req.body);
  return success(res, data, 'Service type updated successfully');
});

const deleteServiceType = asyncHandler(async (req, res) => {
  await serviceTypeService.deleteServiceType(req.params.serviceTypeId);
  return success(res, null, 'Service type deactivated successfully');
});

module.exports = {
  getServiceTypes,
  getServiceTypeById,
  createServiceType,
  updateServiceType,
  deleteServiceType,
};
