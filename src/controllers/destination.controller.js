/**
 * Destination Controller
 * Handles HTTP requests for lead management endpoints
 */


const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { createDestination, updateDestination, getLevelListData, getServiceListData, createServiceData, updateServiceData } = require('../services/destination.service');

/**
 * Create a new Destination
 */
const createDestinationData = asyncHandler(async (req, res) => {
  const Destination = await createDestination(req.body);
  return success(res, Destination, 'Destination created successfully', 201);
});



/**
 * UpdateDestination Destination
 */
const updateDestinationData = asyncHandler(async (req, res) => {
  const lead = await updateDestination(req.body);
  return success(res, lead, 'Destination updated successfully');
});


/**
 * LevelList 
 */
const getLevelList = asyncHandler(async (req, res) => {
   const LevelList = await getLevelListData();
  return success(res, LevelList, 'Level List retrieved successfully');
});

/**
 * LevelList 
 */
const getServiceList = asyncHandler(async (req, res) => {
   const ServiceList = await getServiceListData();
  return success(res, ServiceList, 'Service List retrieved successfully');
});

/**
 * Create a new Services
 */
const createService = asyncHandler(async (req, res) => {
  const Service = await createServiceData(req.body);
  
  return success(res, Service, 'Service created/updated successfully', 201);
});

/**
 * Update Services data
 */
const updateService = asyncHandler(async (req, res) => {
  const service = await updateServiceData(req.body);
  return success(res, service, 'Service(s) updated successfully');
});






module.exports = {
  createDestinationData,
  updateDestinationData,
  getLevelList,
  getServiceList,
  createService,
  updateService,
 };
