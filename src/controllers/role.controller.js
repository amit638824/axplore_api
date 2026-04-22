/**
 * Role Controller
 * Handles HTTP requests for Role management endpoints
 */

const roleService = require('../services/role.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get Roles
 */
const getRoles = asyncHandler(async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status || "all";
  const data = await roleService.getRolesdata(search, page, limit, status);
  return success(res, data, 'Role list retrieved successfully');
});

/**
 * Get Role by ID
 */
const getRoleById = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const role = await roleService.getRoleById(roleId);
  return success(res, role, 'Role retrieved successfully');
});

/**
 * Create Role
 */
const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(req.body);
  return success(res, role, 'Role created successfully', 201);
});

/**
 * Update Role
 */
const updateRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const role = await roleService.updateRole(roleId, req.body);
  return success(res, role, 'Role updated successfully');
});

/**
 * Delete Role
 */
const deleteRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  await roleService.deleteRole(roleId);
  return success(res, null, 'Role deleted successfully');
});

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
