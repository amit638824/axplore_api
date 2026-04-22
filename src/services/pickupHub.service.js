/**
 * Pickup Hub Service
 * Business logic for master_pickup_hub management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * Get all pickup hubs with filters
 * @param {Object} query - Filter parameters
 * @returns {Promise<Array>} - List of pickup hubs
 */
const getPickupHubs = async (query = {}) => {
  const { cityId, type, isActive } = query;

  const where = {
    ...(cityId && { city_id: cityId }),
    ...(type && { hub_type: type }),
    ...(isActive !== undefined && { is_active: Boolean(isActive) }),
  };

  const hubs = await prisma.master_pickup_hub.findMany({
    where,
    include: {
      master_city: {
        include: {
          state: {
            include: {
              country: true
            }
          }
        }
      }
    },
    orderBy: { hub_name: 'asc' },
  });

  return hubs;
};

/**
 * Get a specific pickup hub by ID
 * @param {string} hubId - Hub UUID
 * @returns {Promise<Object>} - The hub object
 */
const getPickupHubById = async (hubId) => {
  const hub = await prisma.master_pickup_hub.findUnique({
    where: { hub_id: hubId },
    include: {
       master_city: {
         include: {
           state: {
             include: {
               country: true
             }
           }
         }
       }
    }
  });

  if (!hub) {
    throw new NotFoundError(`Pickup Hub with ID ${hubId} not found`);
  }

  return hub;
};

/**
 * Create a new pickup hub
 * @param {Object} data - Hub details
 * @param {string} userId - ID of the user creating the hub
 * @returns {Promise<Object>} - Created hub
 */
const createPickupHub = async (data, userId) => {
  // Check if IATA code already exists
  const existing = await prisma.master_pickup_hub.findUnique({
    where: { hub_code_iata: data.hub_code_iata },
  });

  if (existing) {
    throw new ValidationError(`Hub Code IATA ${data.hub_code_iata} already exists`);
  }

  return await prisma.master_pickup_hub.create({
    data: {
      ...data,
      created_by: userId,
    },
  });
};

/**
 * Update a pickup hub
 * @param {string} hubId - Hub UUID
 * @param {Object} data - Updated hub details
 * @param {string} userId - ID of the user modifying the hub
 * @returns {Promise<Object>} - Updated hub
 */
const updatePickupHub = async (hubId, data, userId) => {
  const hub = await prisma.master_pickup_hub.findUnique({
    where: { hub_id: hubId },
  });

  if (!hub) {
    throw new NotFoundError(`Pickup Hub with ID ${hubId} not found`);
  }

  // If IATA code is being updated, check for duplicates
  if (data.hub_code_iata && data.hub_code_iata !== hub.hub_code_iata) {
    const existing = await prisma.master_pickup_hub.findUnique({
      where: { hub_code_iata: data.hub_code_iata },
    });
    if (existing) {
      throw new ValidationError(`Hub Code IATA ${data.hub_code_iata} already exists`);
    }
  }

  return await prisma.master_pickup_hub.update({
    where: { hub_id: hubId },
    data: {
      ...data,
      modified_at: new Date(),
      modified_by: userId,
    },
  });
};

/**
 * Deactivate a pickup hub (soft delete)
 * @param {string} hubId - Hub UUID
 * @param {string} userId - ID of the user deactivating the hub
 * @returns {Promise<Object>} - Updated hub
 */
const deletePickupHub = async (hubId, userId) => {
  const hub = await prisma.master_pickup_hub.findUnique({
    where: { hub_id: hubId },
  });

  if (!hub) {
    throw new NotFoundError(`Pickup Hub with ID ${hubId} not found`);
  }

  return await prisma.master_pickup_hub.update({
    where: { hub_id: hubId },
    data: {
      is_active: false,
      modified_at: new Date(),
      modified_by: userId,
    },
  });
};

module.exports = {
  getPickupHubs,
  getPickupHubById,
  createPickupHub,
  updatePickupHub,
  deletePickupHub,
};
