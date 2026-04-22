/**
 * Service Category Routes
 * CRUD for Master ServiceCategory
 */

const express = require('express');
const router = express.Router();
const serviceCategoryController = require('../controllers/serviceCategory.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const {
  queryServiceCategorySchema,
  createServiceCategorySchema,
  updateServiceCategorySchema,
} = require('../validators/serviceCategory.validator');

router.use(authenticate);

router.get('/', validate(queryServiceCategorySchema, 'query'), serviceCategoryController.getServiceCategories);
router.get('/:serviceCategoryId', serviceCategoryController.getServiceCategoryById);
router.post('/', validate(createServiceCategorySchema), serviceCategoryController.createServiceCategory);
router.put('/:serviceCategoryId', validate(updateServiceCategorySchema), serviceCategoryController.updateServiceCategory);
router.delete('/:serviceCategoryId', serviceCategoryController.deleteServiceCategory);

module.exports = router;
