/**
 * Pickup Hub Routes
 * CRUD for Master PickupHub
 */

const express = require('express');
const router = express.Router();
const pickupHubController = require('../controllers/pickupHub.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { queryPickupHubSchema, createPickupHubSchema, updatePickupHubSchema } = require('../validators/pickupHub.validator');

router.use(authenticate);

router.get('/', validate(queryPickupHubSchema, 'query'), pickupHubController.getPickupHubs);
router.get('/:pickupHubId', pickupHubController.getPickupHubById);
router.post('/', validate(createPickupHubSchema), pickupHubController.createPickupHub);
router.put('/:pickupHubId', validate(updatePickupHubSchema), pickupHubController.updatePickupHub);
router.delete('/:pickupHubId', pickupHubController.deletePickupHub);

module.exports = router;
