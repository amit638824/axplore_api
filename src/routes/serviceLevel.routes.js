/**
 * Service Level Routes
 * CRUD for Master ServiceLevel
 */

const express = require('express');
const router = express.Router();
const serviceLevelController = require('../controllers/serviceLevel.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const {
  queryServiceLevelSchema,
  createServiceLevelSchema,
  updateServiceLevelSchema,
} = require('../validators/serviceLevel.validator');

router.use(authenticate);

router.get('/', validate(queryServiceLevelSchema, 'query'), serviceLevelController.getServiceLevels);
router.get('/:serviceLevelId', serviceLevelController.getServiceLevelById);
router.post('/', validate(createServiceLevelSchema), serviceLevelController.createServiceLevel);
router.put('/:serviceLevelId', validate(updateServiceLevelSchema), serviceLevelController.updateServiceLevel);
router.delete('/:serviceLevelId', serviceLevelController.deleteServiceLevel);

module.exports = router;
