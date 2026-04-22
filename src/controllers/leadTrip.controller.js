/**
 * Lead Controller
 * Handles HTTP requests for lead management endpoints
 */


const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { createLeadTripInfo, updateLeadTripInfo } = require('../services/leadTrip.service');

/**
 * Create a new lead
 */
const createLeadTrip = asyncHandler(async (req, res) => {
  console.log("data", req.body);
  const leadTrip = await createLeadTripInfo(req.body, req.userId);
  return success(res, leadTrip, 'Lead Trip created successfully', 201);
});



/**
 * Update lead Trip
 */
const updateLeadTrip = asyncHandler(async (req, res) => {
  const { leadId, modifiedBy } = req.body;
  const lead = await updateLeadTripInfo(leadId, req.body, modifiedBy);
  return success(res, lead, 'Lead updated successfully');
});


module.exports = {
  createLeadTrip,
  updateLeadTrip,
};
