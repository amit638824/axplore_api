/**
 * Document Routes
 * Document management endpoints
 */

const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @route GET /api/documents/lead
 * @description Get master documents for leads
 * @access Private
 */
router.get('/lead', authenticate, documentController.getLeadDocuments);

module.exports = router;
