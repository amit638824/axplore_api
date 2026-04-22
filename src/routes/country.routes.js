/**
 * Country Routes
 * Defines routes for country management endpoints (list, view by id, add, edit)
 */

const express = require('express');
const router = express.Router();
const countryController = require('../controllers/country.controller.js');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { createCountrySchema, updateCountrySchema } = require('../validators/country.validator');

router.use(authenticate);

router.get('/', countryController.getCountrys);
router.get('/:countryId', countryController.getCountryById);
router.post('/add/', validate(createCountrySchema), countryController.createCountry);
router.put('/update/:countryId', validate(updateCountrySchema), countryController.updateCountry);
router.delete('/:countryId', countryController.deleteCountry);

module.exports = router;

