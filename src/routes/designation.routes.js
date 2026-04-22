/**
 * Designation Routes
 * CRUD for Master Designation
 */

const express = require('express');
const router = express.Router();
const designationController = require('../controllers/designation.controller.js');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { queryDesignationSchema, createDesignationSchema, updateDesignationSchema } = require('../validators/designation.validator');

router.use(authenticate);

router.get('/', validate(queryDesignationSchema, 'query'), designationController.getDesignations);
router.get('/:designationId', designationController.getDesignationById);
router.post('/add', validate(createDesignationSchema), designationController.createDesignation);
router.put('/update/:designationId', validate(updateDesignationSchema), designationController.updateDesignation);
router.delete('/delete/:designationId', designationController.deleteDesignation);

module.exports = router;
