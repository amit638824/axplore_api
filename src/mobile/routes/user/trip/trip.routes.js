const express = require('express');
const router = express.Router();
const tripController = require('../../../controllers/user/trip/trip.controller.js');


const { paxAuth } = require("../../../middleware/paxAuth.js");

router.get('/my-trips', paxAuth, tripController.getMyTrips);
router.get('/:tripId', paxAuth, tripController.getTripById);
router.post('/join-trip', paxAuth, tripController.joinTrip);

module.exports = router;