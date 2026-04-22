/**
 * Lead Status Controller
 * Handles HTTP requests for Lead Status management endpoints
 */

const LeadStatusService = require('../services/leadstatus.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get Lead Status
 */
const getLeadstatus = asyncHandler(async (req, res) => {
  const Leadstatus = await LeadStatusService.getLeadstatus();
  return success(res, Leadstatus, 'Lead Status retrieved successfully');
});

module.exports = {
   getLeadstatus,
 };
