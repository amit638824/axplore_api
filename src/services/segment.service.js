/**
 * Segment Service
 * Business logic for Segment management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');

/**
 * Get Segment list
 */
const getSegment = async () => {
  const Segment = await prisma.masterLeadSegment.findMany({
    where: {isActive: true},
    select: {
      leadSegmentId: true, segmentCode: true, segmentName: true, description: true,  displayOrder: true, createdAt: true,
    },
  });
  if (!Segment) {
    throw new NotFoundError('Segment');
  }
  return Segment;
};

module.exports = {
   getSegment,
 };
