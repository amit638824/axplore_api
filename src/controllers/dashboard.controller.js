/**
 * Dashboard Controller
 * Handles HTTP requests for Dashboard management endpoints
 */

const dashboardService = require('../services/dashboard.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get Lead Count
 */
const getLeadCount = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const userId = req.user.userId;
  const createdBy = req.query.createdBy || userId;
  const dataType = req.query.dataType;
  const activeRoleId = req.activeRoleId;

  const dashboard = await dashboardService.getLeadCount(createdBy, email, dataType, activeRoleId);
  return success(res, dashboard, 'Lead count retrieved successfully');
});

/**
 * Get Coustomers Count
 */
const getCustomerCount = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const userId = req.user.userId;
  const createdBy = req.query.createdBy || userId;
  const dataType = req.query.dataType;
  const customerCount = await dashboardService.getCustomerCount(createdBy, email, dataType);
  return success(res, customerCount, 'Customer count retrieved successfully');
});

/**
 * Get Total Budget
 */
const getTotalBudget = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const userId = req.user.userId;
  const createdBy = req.query.createdBy || userId;
  const dataType = req.query.dataType;
  const activeRoleId = req.activeRoleId;

  const totalBudget = await dashboardService.getTotalBudget(createdBy, email, dataType, activeRoleId);
  return success(res, totalBudget, 'Total budget retrieved successfully');
});


/**
 * Get Total Revenue ////////
 */
const getTotalRevenue = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const userId = req.user.userId;
  const createdBy = req.query.createdBy || userId;
  const dataType = req.query.dataType;
  const activeRoleId = req.activeRoleId;

  const totalRevenue = await dashboardService.getTotalRevenue(createdBy, email, dataType, activeRoleId);
  return success(res, totalRevenue, 'Total revenue retrieved successfully');
});



const getTotalLeadStatusTime = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const userId = req.user.userId;
  const createdBy = req.query.createdBy || userId;
  const dataType = req.query.dataType;
  const activeRoleId = req.activeRoleId;

  const totalLeadStatusTime = await dashboardService.getTotalLeadStatusTime(createdBy, email, dataType, activeRoleId);
  return success(res, totalLeadStatusTime, 'Total lead status time retrieved successfully');
});

const getGraph = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const userId = req.user.userId;
  const createdBy = req.query.createdBy || userId;
  const dataType = req.query.dataType;
  const activeRoleId = req.activeRoleId;

  const graph = await dashboardService.getGraph(createdBy, email, dataType, activeRoleId);
  return success(res, graph, 'Graph retrieved successfully');
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const userId = req.user.userId;
  const createdBy = req.query.createdBy || userId;
  const dataType = req.query.dataType;
  const activeRoleId = req.activeRoleId;

  const stats = await dashboardService.getDashboardStats(createdBy, email, dataType, activeRoleId);
  return success(res, stats, 'Dashboard stats retrieved successfully');
});

module.exports = {
  getLeadCount,
  getCustomerCount,
  getTotalBudget,
  getTotalRevenue,
  getTotalLeadStatusTime,
  getGraph,
  getDashboardStats,
};
