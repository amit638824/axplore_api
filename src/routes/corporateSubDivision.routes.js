/**
 * Segment Routes
 * Defines routes for Segment management endpoints
 */

const express = require('express');
const router = express.Router();
const CorporateSubDivisionController = require('../controllers/corporateSubDivision.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { queryCorporateSubDivisionSchema, addSubDivisionSchema, deleteSubDivisionSchema, addressSubDivisionSchema } = require('../validators/corporateSubDivision.validator');

// All routes require authentication
router.use(authenticate);

// Segment routes


// this api only for sub division
router.get('/id/:divisionId', CorporateSubDivisionController.getSubDivisionById);
// this api for details of sub division
router.get('/:divisionId', CorporateSubDivisionController.getCorporateSubDivisionById);

router.post('/add', validate(addSubDivisionSchema), CorporateSubDivisionController.addSubDivision);
router.post('/delete', validate(deleteSubDivisionSchema), CorporateSubDivisionController.deleteSubDivision);
// corporate sub division address
router.post('/address', validate(addressSubDivisionSchema), CorporateSubDivisionController.subDivisionAddress);
router.get('/address/list', CorporateSubDivisionController.subDivisionAddressList);
module.exports = router;
