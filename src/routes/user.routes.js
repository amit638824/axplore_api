/**
 * User Routes
 * Defines routes for User management endpoints
 */

const express = require('express');
const router = express.Router();
const User = require('../controllers/user.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { queryUserAddSchema, queryUserDeleteSchema } = require('../validators/user.validator');

// All routes require authentication
router.use(authenticate);

// User routes

router.get('/designations/:designationId', User.getUsersByDesignationId);
router.get('/:travelAgencyId', User.getUserTravelAgencyById);
router.post('/add', validate(queryUserAddSchema), User.addUser);
router.post('/delete', validate(queryUserDeleteSchema), User.deleteUser);
router.get('/list/userdata', User.getUserList);
router.get('/hierarchy/subordinates', User.getSubordinates);
router.get('/config/next-code', User.getNextEmployeeCode);

module.exports = router;
