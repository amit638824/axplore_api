/**
 * State Service
 * Business logic for Master State CRUD operations
 */

const { prisma } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

const getStates = async (filters = {}) => {
  const where = {};
  if (filters.countryId) where.countryId = filters.countryId;

  const list = await prisma.masterState.findMany({
    where,
    select: {
      stateId: true,
      countryId: true,
      name: true,
      country: { select: { countryId: true, name: true, isoCode: true } },
    },
    orderBy: { name: 'asc' },
  });
  return list;
};

const getStateById = async (stateId) => {
  const state = await prisma.masterState.findUnique({
    where: { stateId },
    include: { country: { select: { countryId: true, name: true, isoCode: true } } },
  });
  if (!state) throw new NotFoundError('State');
  return state;
};

const createState = async (data) => {
  return prisma.masterState.create({
    data: {
      countryId: data.countryId,
      name: data.name,
    },
  });
};

const updateState = async (stateId, data) => {
  await getStateById(stateId);
  return prisma.masterState.update({
    where: { stateId },
    data: {
      ...(data.countryId != null && { countryId: data.countryId }),
      ...(data.name != null && { name: data.name }),
    },
  });
};

const deleteState = async (stateId) => {
  await getStateById(stateId);
  await prisma.masterState.delete({ where: { stateId } });
  return null;
};

module.exports = {
  getStates,
  getStateById,
  createState,
  updateState,
  deleteState,
};
