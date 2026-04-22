/**
 * Division Routes
 * Defines routes for Division management endpoints
 */

const express = require('express');
const router = express.Router();
const CorporateDivisionController = require('../controllers/corporateDivision.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { queryCorporateDivisionSchema, addCorporateDivisionSchema, updateDivisionStatusSchema } = require('../validators/corporateDivision.validator');

// All routes require authentication
router.use(authenticate);

// Division routes



router.get('/list', validate(queryCorporateDivisionSchema), CorporateDivisionController.getDivisionList);
router.post('/add', validate(addCorporateDivisionSchema), CorporateDivisionController.addDivision);
router.post('/updateStatus', validate(updateDivisionStatusSchema), CorporateDivisionController.updateDivision);
module.exports = router;
