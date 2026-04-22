/**
 * Role Routes
 * Defines routes for Role management endpoints
 */

const express = require('express');
const router = express.Router();
const RoleController = require('../controllers/role.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Role routes
router.get('/list', RoleController.getRoles);
router.get('/:roleId', RoleController.getRoleById);
router.post('/', RoleController.createRole);
router.put('/:roleId', RoleController.updateRole);
router.delete('/:roleId', RoleController.deleteRole);

module.exports = router;
