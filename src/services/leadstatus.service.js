/**
 * lead Status Service
 * Business logic for lead Status management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');

/**
 * Get lead Status list
 */
const getLeadstatus = async () => {
  const Leadstatus = await prisma.masterLeadStatus.findMany({
    where: {isActive: true},
    select: {
      leadStatusId: true, statusCode: true, statusName: true, description: true,  displayOrder: true, createdAt: true,
    },
  });
  if (!Leadstatus) {
    throw new NotFoundError('Leadstatus');
  }
  return Leadstatus;
};

module.exports = {
   getLeadstatus,
 };
