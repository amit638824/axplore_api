/**
 * City Controller
 * Handles HTTP requests for City management endpoints ///
 */

const cityService = require('../services/city.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get City
 */
const getCityById = asyncHandler(async (req, res) => {
  const { countryId } = req.params;
  const City = await cityService.getCityById(countryId);
  return success(res, City, 'City retrieved successfully');
});


/**
 * Add City (create)
 */
const createCity = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    data.city_image = `uploads/city/${req.file.filename}`;
  }
  const city = await cityService.createCity(data);
  return success(res, city, 'City created successfully', 201);
});


/**
 * Edit City (update)
 */
const updateCity = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    data.city_image = `uploads/city/${req.file.filename}`;
  }
  const updatedCity = await cityService.updateCity(req.params.cityId, data);
  return success(res, updatedCity, 'City updated successfully');
});



const getOrigins = asyncHandler(async (req, res) => {
  const data = await cityService.getOriginsdata();
  return success(res, data, 'Origin/destination retrieved successfully');
});


/**
 * Delete City
 */
const deleteCity = asyncHandler(async (req, res) => {
  await cityService.deleteCity(req.params.cityId);
  return success(res, null, 'City deleted successfully');
});

module.exports = {
  getCityById,
  createCity,
  updateCity,
  deleteCity,
  getOrigins,
};

