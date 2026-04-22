const express = require('express');
const router = express.Router();
const leadActivityController = require('../controllers/leadActivity.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', leadActivityController.getLeadActivityLogs);

module.exports = router;
