/**
 * Lead Routes
 * Defines routes for lead management endpoints
 */

const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const fileUpload = require('express-fileupload');

const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { createLeadSchema, updateLeadSchema, queryLeadSchema, getLeadsBodySchema, updateLeadStatusSchema, updateLeadRequirementNotesSchema, destinationReportSchema, deactivateLeadPickupHubSchema } = require('../validators/lead.validator');

const uploadDocument = require('../utils/multerDocument');

// All routes require authentication
router.use(authenticate);

// Lead routes
router.post('/', validate(createLeadSchema), leadController.createLead);
router.post('/getLeads/', validate(getLeadsBodySchema), validate(queryLeadSchema, 'query'), leadController.getLeads);
router.get('/master-pickup-hub', leadController.listMasterPickupHubs);
router.get('/:leadId', leadController.getLeadById);
router.post('/totalLeads', leadController.getTotalLeads);
router.post('/totalLeadStatus', leadController.getTotalLeadStatus);
router.post('/confirmation', fileUpload({ limits: { fileSize: 10 * 1024 * 1024 }, useTempFiles: false, abortOnLimit: true }), leadController.confirmLead);


router.post('/update/:leadId', validate(updateLeadSchema), leadController.updateLead);
router.post('/status/:leadId', validate(updateLeadStatusSchema), leadController.updateLeadStatus);
router.post('/requirement/:leadId', validate(updateLeadRequirementNotesSchema), leadController.updateLeadRequirementNotes);
router.delete('/:leadId', leadController.deleteLead);
router.post('/delete', leadController.deleteLead);

router.post('/lead-hub', leadController.storeLeadPickup);
router.get('/alldataByLeadId/:leadId', leadController.getAllLeadData);
router.post('/destinationReport', validate(destinationReportSchema), leadController.getDestinationReport);
router.get('/:leadId/history', leadController.getLeadHistory);
router.get('/involved/:userId', leadController.getLeadsByInvolvement);

// Upload document to S3
router.post('/lead-confirmation-doc-upload', fileUpload({ limits: { fileSize: 10 * 1024 * 1024 }, useTempFiles: false, abortOnLimit: true }), leadController.uploadLeadDocumentS3);


// Toggle document active status
router.post('/document/status', leadController.toggleLeadDocumentStatus);

// Deactivate pickup hub
router.post('/deactivate-hub', validate(deactivateLeadPickupHubSchema), leadController.deactivateLeadPickupHub);


module.exports = router;


