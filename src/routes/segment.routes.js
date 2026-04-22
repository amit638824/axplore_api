/**
 * Segment Routes
 * Defines routes for Segment management endpoints
 */

const express = require('express');
const router = express.Router();
const SegmentController = require('../controllers/segment.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { querySegmentSchema } = require('../validators/segment.validator');

// All routes require authentication
router.use(authenticate);

// Segment routes
router.get('/', SegmentController.getSegments);
module.exports = router;
