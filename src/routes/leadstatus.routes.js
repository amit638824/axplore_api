/**
 * lead Status Routes
 * Defines routes for Segment management endpoints
 */

const express = require('express');
const router = express.Router();
const leadstatusController = require('../controllers/leadstatus.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { queryleadstatusSchema } = require('../validators/leadStatus.validator');

// All routes require authentication
router.use(authenticate);

// lead Status routes

router.get('/', leadstatusController.getLeadstatus);
module.exports = router;
