/**
 * Designation Controller
 * Handles HTTP requests for Master Designation CRUD endpoints
 */

const designationService = require('../services/designation.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

const getDesignations = asyncHandler(async (req, res) => {
  const data = await designationService.getDesignations(req.query);
  return success(res, data, 'Designations retrieved successfully');
});

const getDesignationById = asyncHandler(async (req, res) => {
  const data = await designationService.getDesignationById(req.params.designationId);
  return success(res, data, 'Designation retrieved successfully');
});

const createDesignation = asyncHandler(async (req, res) => {
  const data = await designationService.createDesignation(req.body);
  return success(res, data, 'Designation created successfully', 201);
});

const updateDesignation = asyncHandler(async (req, res) => {
  const data = await designationService.updateDesignation(req.params.designationId, req.body);
  return success(res, data, 'Designation updated successfully');
});

const deleteDesignation = asyncHandler(async (req, res) => {
  await designationService.deleteDesignation(req.params.designationId);
  return success(res, null, 'Designation deactivated successfully');
});

module.exports = {
  getDesignations,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
};
