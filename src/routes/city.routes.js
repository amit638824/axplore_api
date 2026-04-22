/**
 * City Routes
 * Defines routes for City management endpoints
 */

const express = require('express');
const router = express.Router();
const CityController = require('../controllers/city.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { queryCitySchema, createCitySchema, updateCitySchema } = require('../validators/city.validator');
const uploadCity = require('../utils/multerCity');

// All routes require authentication
router.use(authenticate);

// City routes
router.get('/getOrigins', CityController.getOrigins);
router.get('/', CityController.getCityById); // Get all cities
router.get('/:countryId', CityController.getCityById); // Get cities by country
router.post('/add/', uploadCity.single('city_image'), validate(createCitySchema), CityController.createCity);
router.put('/update/:cityId', uploadCity.single('city_image'), validate(updateCitySchema), CityController.updateCity);

router.delete('/:cityId', CityController.deleteCity);

module.exports = router;

