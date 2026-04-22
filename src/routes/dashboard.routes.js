/**
 * Dashboard Routes
 * Defines routes for Dashboard management endpoints
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { queryDashboardSchema } = require('../validators/dashboard.validator');

// All routes require authentication
router.use(authenticate);

// Dashboard routes //////////
router.get('/leadCount', dashboardController.getLeadCount);
router.get('/customerCount', dashboardController.getCustomerCount);
router.get('/totalBudget', dashboardController.getTotalBudget);
router.get('/totalRevenue', dashboardController.getTotalRevenue);
router.get('/totalLeadStatusTime', dashboardController.getTotalLeadStatusTime);
router.get('/graph', dashboardController.getGraph);
router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;
