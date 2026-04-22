/**
 * //Trip Info Trip Routes
 * Defines routes for Trip Info Trip management endpoints
 */

const express = require('express');
const router = express.Router();
const leadTripController = require('../controllers/leadTrip.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

const { createLeadTripSchema, updateLeadTripSchema } = require('../validators/leadTrip.validator');

// All routes require authentication
router.use(authenticate);

// Trip Info trip routes
router.post('/', validate(createLeadTripSchema), leadTripController.createLeadTrip);
router.post('/update/', validate(updateLeadTripSchema), leadTripController.updateLeadTrip);

module.exports = router;
