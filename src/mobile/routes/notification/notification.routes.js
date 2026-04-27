const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notification/notification.controller');
const { paxAuth } = require('../../middleware/paxAuth');


// Get all notifications for the logger in user
router.get('/list', paxAuth, notificationController.list);
router.post('/mark-as-read', paxAuth, notificationController.updateStatus);
router.post('/delete', paxAuth, notificationController.remove);


module.exports = router;
