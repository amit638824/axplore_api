const express = require('express');
const router = express.Router();
const tripController = require('../../../controllers/user/trip/trip.controller.js');

const upload = require("../../../middleware/upload.js");

const { paxAuth } = require("../../../middleware/paxAuth.js");

router.get('/my-trips', paxAuth, tripController.getMyTrips);
router.post('/join-trip', paxAuth, tripController.joinTrip);
router.post('/status-tracker', paxAuth, tripController.getStatusTracker);
router.post('/trip-info-update', paxAuth, tripController.updateTripDetails);
router.get('/:tripId', paxAuth, tripController.getTripById);


// PASSPORT UPLOAD
router.post('/passport-upload-front', paxAuth, upload.single('image'), tripController.uploadPassport);
router.post('/passport-upload-back', paxAuth, upload.single('image'), tripController.uploadPassport);




module.exports = router;