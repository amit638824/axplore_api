/**
 * Service Category Controller
 * Handles HTTP requests for Master ServiceCategory CRUD endpoints
 */

const serviceCategoryService = require('../services/serviceCategory.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

const getServiceCategories = asyncHandler(async (req, res) => {
  const data = await serviceCategoryService.getServiceCategories(req.query);
  return success(res, data, 'Service categories retrieved successfully');
});

const getServiceCategoryById = asyncHandler(async (req, res) => {
  const data = await serviceCategoryService.getServiceCategoryById(req.params.serviceCategoryId);
  return success(res, data, 'Service category retrieved successfully');
});

const createServiceCategory = asyncHandler(async (req, res) => {
  const data = await serviceCategoryService.createServiceCategory(req.body);
  return success(res, data, 'Service category created successfully', 201);
});

const updateServiceCategory = asyncHandler(async (req, res) => {
  const data = await serviceCategoryService.updateServiceCategory(req.params.serviceCategoryId, req.body);
  return success(res, data, 'Service category updated successfully');
});

const deleteServiceCategory = asyncHandler(async (req, res) => {
  await serviceCategoryService.deleteServiceCategory(req.params.serviceCategoryId);
  return success(res, null, 'Service category deactivated successfully');
});

module.exports = {
  getServiceCategories,
  getServiceCategoryById,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
};
