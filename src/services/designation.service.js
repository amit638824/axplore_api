/**
 * Designation Service
 * Business logic for Master Designation CRUD operations
 */

const { prisma } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

const getDesignations = async (filters = {}) => {
  const where = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;

  const list = await prisma.masterDesignation.findMany({
    where,
    orderBy: { designationName: 'asc' },
  });
  return list;
};

const getDesignationById = async (designationId) => {
  const row = await prisma.masterDesignation.findUnique({
    where: { designationId },
  });
  if (!row) throw new NotFoundError('Designation');
  return row;
};

const createDesignation = async (data) => {
  return prisma.masterDesignation.create({
    data: {
      designationCode: data.designationCode,
      designationName: data.designationName,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
};

const updateDesignation = async (designationId, data) => {
  await getDesignationById(designationId);
  return prisma.masterDesignation.update({
    where: { designationId },
    data: {
      ...(data.designationCode != null && { designationCode: data.designationCode }),
      ...(data.designationName != null && { designationName: data.designationName }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
};

const deleteDesignation = async (designationId) => {
  await getDesignationById(designationId);
  return prisma.masterDesignation.update({
    where: { designationId },
    data: { isActive: false },
  });
};

module.exports = {
  getDesignations,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
};
