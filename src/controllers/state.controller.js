/**
 * State Controller
 * Handles HTTP requests for Master State CRUD endpoints
 */

const stateService = require('../services/state.service.js');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

const getStates = asyncHandler(async (req, res) => {
  const data = await stateService.getStates(req.query);
  return success(res, data, 'States retrieved successfully');
});

const getStateById = asyncHandler(async (req, res) => {
  const data = await stateService.getStateById(req.params.stateId);
  return success(res, data, 'State retrieved successfully');
});

const createState = asyncHandler(async (req, res) => {
  const data = await stateService.createState(req.body);
  return success(res, data, 'State created successfully', 201);
});

const updateState = asyncHandler(async (req, res) => {
  const data = await stateService.updateState(req.params.stateId, req.body);
  return success(res, data, 'State updated successfully');
});

const deleteState = asyncHandler(async (req, res) => {
  await stateService.deleteState(req.params.stateId);
  return success(res, null, 'State deleted successfully');
});

module.exports = {
  getStates,
  getStateById,
  createState,
  updateState,
  deleteState,
};
