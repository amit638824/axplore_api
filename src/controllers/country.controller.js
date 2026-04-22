/**
 * Country Controller
 * Handles HTTP requests for Country management endpoints
 */

const countryService = require('../services/country.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get country list
 */
const getCountrys = asyncHandler(async (req, res) => {
  const data = await countryService.getCountry();
  return success(res, data, 'Country retrieved successfully');
});

/**
 * Get country by ID (view)
 */
const getCountryById = asyncHandler(async (req, res) => {
  const data = await countryService.getCountryById(req.params.countryId);
  return success(res, data, 'Country retrieved successfully');
});

/**
 * Add country (create)
 */
const createCountry = asyncHandler(async (req, res) => {
  const data = await countryService.createCountry(req.body);
  return success(res, data, 'Country created successfully', 201);
});

/**
 * Edit country (update)
 */
const updateCountry = asyncHandler(async (req, res) => {
  const data = await countryService.updateCountry(req.params.countryId, req.body);
  return success(res, data, 'Country updated successfully');
});

/**
 * Delete country
 */
const deleteCountry = asyncHandler(async (req, res) => {
  await countryService.deleteCountry(req.params.countryId);
  return success(res, null, 'Country deleted successfully');
});

module.exports = {
  getCountrys,
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry,
};

