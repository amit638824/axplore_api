/**
 * Pickup Hub Controller
 * Handles HTTP requests for Master PickupHub CRUD endpoints
 */

const pickupHubService = require('../services/pickupHub.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

const getPickupHubs = asyncHandler(async (req, res) => {
  const data = await pickupHubService.getPickupHubs(req.query);
  return success(res, data, 'Pickup hubs retrieved successfully');
});

const getPickupHubById = asyncHandler(async (req, res) => {
  const data = await pickupHubService.getPickupHubById(req.params.pickupHubId);
  return success(res, data, 'Pickup hub retrieved successfully');
});

const createPickupHub = asyncHandler(async (req, res) => {
  const data = await pickupHubService.createPickupHub(req.body, req.userId);
  return success(res, data, 'Pickup hub created successfully', 201);
});

const updatePickupHub = asyncHandler(async (req, res) => {
  const data = await pickupHubService.updatePickupHub(req.params.pickupHubId, req.body, req.userId);
  return success(res, data, 'Pickup hub updated successfully');
});

const deletePickupHub = asyncHandler(async (req, res) => {
  await pickupHubService.deletePickupHub(req.params.pickupHubId, req.userId);
  return success(res, null, 'Pickup hub deactivated successfully');
});

module.exports = {
  getPickupHubs,
  getPickupHubById,
  createPickupHub,
  updatePickupHub,
  deletePickupHub,
};
