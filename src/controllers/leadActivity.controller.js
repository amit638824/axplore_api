const leadActivityService = require('../services/leadActivity.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get Lead Activity Logs
 */
const getLeadActivityLogs = asyncHandler(async (req, res) => {
  const { page, limit, search, userId, action } = req.query;
  
  const result = await leadActivityService.getLeadActivityLogs({
    page,
    limit,
    search,
    userId,
    action
  });

  return success(res, result, 'Lead activity logs retrieved successfully');
});

module.exports = {
  getLeadActivityLogs
};
