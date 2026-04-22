/**
 * Segment Controller
 * Handles HTTP requests for Segment management endpoints
 */

const segmentService = require('../services/segment.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get Segment
 */
const getSegments = asyncHandler(async (req, res) => {
    const segment = await segmentService.getSegment();
  return success(res, segment, 'Segment retrieved successfully');
});

module.exports = {
   getSegments,
 };
