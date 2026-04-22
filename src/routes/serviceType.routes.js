/**
 * Service Type Routes
 * CRUD for Master ServiceType
 */

const express = require('express');
const router = express.Router();
const serviceTypeController = require('../controllers/serviceType.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const {
  queryServiceTypeSchema,
  createServiceTypeSchema,
  updateServiceTypeSchema,
} = require('../validators/serviceType.validator');

router.use(authenticate);

router.get('/', validate(queryServiceTypeSchema, 'query'), serviceTypeController.getServiceTypes);
router.get('/:serviceTypeId', serviceTypeController.getServiceTypeById);
router.post('/', validate(createServiceTypeSchema), serviceTypeController.createServiceType);
router.put('/:serviceTypeId', validate(updateServiceTypeSchema), serviceTypeController.updateServiceType);
router.delete('/:serviceTypeId', serviceTypeController.deleteServiceType);

module.exports = router;
