/**
 * Client Corporate Routes
 * Defines routes for Segment management endpoints
 */

const express = require('express');
const router = express.Router();
const corporateController = require('../controllers/corporate.controller');
const { validate } = require('../middleware/validation.js');
const { authenticate } = require('../middleware/auth');
const { addCorporateSchema, statusCorporateSchema, addContactPersonSchema, deleteContactPersonSchema } = require('../validators/corporate.validator.js');
const uploadLogo = require('../utils/multerLogo');
// All routes require authentication
router.use(authenticate);

// Client Corporate routes
router.get('/', corporateController.getCorporate);
router.post('/add', uploadLogo.single('file'), validate(addCorporateSchema), corporateController.addCorporate);
router.get('/contactPersonList', corporateController.getContactPersonList);
router.post('/addContactPerson', validate(addContactPersonSchema), corporateController.addContactPerson);
router.post('/deleteContactPerson', validate(deleteContactPersonSchema), corporateController.deleteContactPerson);
router.get('/list', corporateController.getCorporatesList);
router.post('/updateStatus', validate(statusCorporateSchema), corporateController.updateCorporateStatus);
module.exports = router;
