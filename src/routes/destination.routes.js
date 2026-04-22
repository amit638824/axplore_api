/**
 * //Destination Routes
 * Defines routes for Destination management endpoints
 */

const express = require('express');
const router = express.Router();
const destinationController = require('../controllers/destination.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

const { createDestinationSchema, updateDestinationSchema, createServiceSchema, updateServiceSchema } = require('../validators/destination.validator');

// All routes require authentication
router.use(authenticate);

// Destination routes
router.post('/', validate(createDestinationSchema), destinationController.createDestinationData);
router.post('/update/', validate(updateDestinationSchema), destinationController.updateDestinationData);
router.get('/levelList/', destinationController.getLevelList);
router.get('/serviceList/', destinationController.getServiceList);
router.post('/createService/', validate(createServiceSchema),  destinationController.createService);
router.post('/updateService/', validate(updateServiceSchema),  destinationController.updateService);
module.exports = router;
