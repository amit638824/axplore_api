/**
 * Permission Controller
 */

const permissionService = require('../services/permission.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

const getGroupedPermissions = asyncHandler(async (req, res) => {
  const data = await permissionService.getAllPermissionsGrouped();
  return success(res, data, 'Permissions retrieved successfully');
});

module.exports = {
  getGroupedPermissions
};
