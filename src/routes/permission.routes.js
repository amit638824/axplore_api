/**
 * Permission Routes
 */

const express = require('express');
const router = express.Router();
const PermissionController = require('../controllers/permission.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/list', PermissionController.getGroupedPermissions);

module.exports = router;
