/**
 * User Controller
 * Handles HTTP requests for User management endpoints
 */

const userService = require('../services/user.service');
const { success, paginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get User
 */
const getUserTravelAgencyById = asyncHandler(async (req, res) => {
  const { travelAgencyId } = req.params;
  const Users = await userService.getUserTravelAgencyById(travelAgencyId);
  return success(res, Users, 'User retrieved successfully');
});

const addUser = asyncHandler(async (req, res) => {
  const addUser = await userService.addUser(req.body);
  return success(res, addUser, 'User added/updated successfully');
});

const deleteUser = asyncHandler(async (req, res) => {
  const deleteUser = await userService.deleteUser(req.body);
  return success(res, deleteUser, 'User deleted successfully');
});


const getUsersByDesignationId = asyncHandler(async (req, res) => {
  const { designationId } = req.params;
  const users = await userService.getUsersByDesignationId(designationId);
  return success(res, users, 'Users retrieved successfully by designation');
});

const getUserList = asyncHandler(async (req, res) => {
  const users = await userService.getUserList();
  return success(res, users, 'Users retrieved successfully');
});

/**
 * Get all subordinates in a hierarchy for the logged-in manager
 */
const getSubordinates = asyncHandler(async (req, res) => {
  const managerId = req.userId; // Provided by auth middleware

  // Use the active role's context instead of a hardcoded 'ADMIN' check
  const activeRoleCode = req.user?.activeRole?.roleCode || 'N/A';
  const isAdmin = req.user.isAdmin;

  const subordinates = await userService.getSubordinatesRecursive(managerId, isAdmin);
  return success(res, subordinates, `Hierarchy subordinates retrieved successfully for role: ${activeRoleCode}`);
});

const getNextEmployeeCode = asyncHandler(async (req, res) => {
  const code = await userService.getNextEmployeeCode();
  return success(res, { employeeCode: code }, 'Next employee code retrieved successfully');
});

module.exports = {
  getUserTravelAgencyById,
  addUser,
  deleteUser,
  getUsersByDesignationId,
  getUserList,
  getSubordinates,
  getNextEmployeeCode,
};
