/**
 * CostSheet Routes
 * Defines routes for CostSheet management endpoints
 */

const express = require('express');
const router = express.Router();
const costsheetController = require('../controllers/costsheet.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { queryCostsheetSchema, queryCostsheetSchemaById, queryAddCostsheetSchema, queryUpdateCostsheetSchema, queryUploadCostsheetSchema, deactivateCostsheetSchema } = require('../validators/costsheet.validator');

const upload = require('../utils/multerConfig');

// All routes require authentication
router.use(authenticate);
// CostSheet routes
router.get('/', validate(queryCostsheetSchema), costsheetController.getCostsheet);
router.post('/', validate(queryCostsheetSchema), costsheetController.getCostsheet);
router.post('/id', validate(queryCostsheetSchemaById), costsheetController.getCostsheetById);
router.post('/add', upload.single('file'), validate(queryAddCostsheetSchema), costsheetController.addCostsheet);
router.post('/update', upload.single('file'), validate(queryUpdateCostsheetSchema), costsheetController.addCostsheet);
router.post('/deactivate', validate(deactivateCostsheetSchema), costsheetController.deactivateCostsheet);


module.exports = router;
