/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */

const authService = require('../services/auth.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Login user - bypasses unique constraint errors
 */
const login = asyncHandler(async (req, res) => {
  const { email, password, deviceId, deviceType, deviceName, appVersion } = req.body;
  // Generate deviceId if not provided
  const defaultDeviceId = deviceId ||
    require('crypto')
      .createHash('md5')
      .update((req.ip || req.connection.remoteAddress || 'unknown') + (req.get('user-agent') || 'unknown'))
      .digest('hex');

  const deviceInfo = {
    deviceId: defaultDeviceId,
    deviceType: deviceType || 'web',
    deviceName: deviceName || req.get('user-agent') || 'Unknown Device',
    appVersion: appVersion,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  };

  try {
    const result = await authService.login(email, password, deviceInfo);
    // Return only token
    return success(res, { token: result.token }, 'Login successful');
  } catch (error) {
    // If unique constraint error occurs, still try to generate token
    if (error.code === 'P2002' || error.message.includes('already exists')) {
      // Try to find user and generate token anyway
      try {
        const { prisma } = require('../config/database');
        const user = await prisma.appUser.findFirst({

          // where: {
          //   email: email.toLowerCase(),
          //   isActive: true,
          // },

          where: {
            isActive: true,
            OR: [
              { email: email.toLowerCase() },
              { employeeCode: email },
              { mobile: email },
            ],
          },

          include: {
            auth: true,
          },
        });

        if (user && user.auth) {
          const { comparePassword, generateToken } = authService;
          const isPasswordValid = await comparePassword(password, user.auth.passwordHash);

          if (isPasswordValid) {
            const token = generateToken(user.userId);
            return success(res, { token }, 'Login successful');
          }
        }
      } catch (fallbackError) {
        // If fallback fails, throw original error
        throw error;
      }
    }

    // Re-throw original error if not handled
    throw error;
  }
});

/**
 * Register new user - if email exists, logs in instead
 */
const register = asyncHandler(async (req, res) => {
  // Generate deviceId if not provided
  const defaultDeviceId = req.body.deviceId ||
    require('crypto')
      .createHash('md5')
      .update((req.ip || req.connection.remoteAddress || 'unknown') + (req.get('user-agent') || 'unknown'))
      .digest('hex');

  const deviceInfo = {
    deviceId: defaultDeviceId,
    deviceType: req.body.deviceType || 'web',
    deviceName: req.body.deviceName || req.get('user-agent') || 'Unknown Device',
    appVersion: req.body.appVersion,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  };

  try {
    const result = await authService.register(req.body, deviceInfo);

    if (result.isExistingUser) {
      // User already existed, logged them in
      return success(res, { token: result.token }, 'Login successful (email already registered)', 200);
    } else {
      // New user registered
      return success(res, { token: result.token }, 'User registered successfully', 201);
    }
  } catch (error) {
    // If unique constraint error, try to log in instead
    if (error.code === 'P2002' || error.message.includes('already exists')) {
      try {
        const loginResult = await authService.login(req.body.email, req.body.password, deviceInfo);
        return success(res, { token: loginResult.token }, 'Login successful (email already registered)', 200);
      } catch (loginError) {
        // If login also fails, throw original error
        throw error;
      }
    }

    throw error;
  }
});

/**
 * Change password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.userId, currentPassword, newPassword);
  return success(res, null, 'Password changed successfully');
});

/**
 * Forgot password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  console.log('--- FORGOT PASSWORD CONTROLLER HIT ---');
  const { email } = req.body;
  console.log('Incoming Email/Identifier:', email);

  const requestedIp = req.ip || req.connection.remoteAddress;
  const requestedUserAgent = req.get('user-agent');

  console.log('Metadata:', { requestedIp, requestedUserAgent });

  const result = await authService.forgotPassword(email, requestedIp, requestedUserAgent);
  console.log('Service Result:', result.message);
  return success(res, result, result.message);
});

/**
 * Reset password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);
  return success(res, result, result.message);
});

/**
 * Logout user
 */
const logout = asyncHandler(async (req, res) => {
  const { logoutAll: logoutAllSessions } = req.query;
  const sessionId = req.headers['x-session-id'];
  const userId = req.userId;
  const deviceId = req.headers['x-device-id'];
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (logoutAllSessions === 'true') {
    await authService.logoutAll(userId);
    return success(res, null, 'All sessions logged out successfully');
  } else {
    await authService.logout(userId, sessionId, deviceId, ipAddress);
    return success(res, null, 'Logged out successfully');
  }
});

/**
 * Get current user profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  return success(res, user, 'Profile retrieved successfully');
});

/**
 * Get user info with menus and submenus
 */
const getUserInfo = asyncHandler(async (req, res) => {
  const { roleId } = req.query;
  const userInfo = await authService.getUserInfoWithMenus(req.userId, roleId || req.activeRoleId);
  return success(res, userInfo, 'User information retrieved successfully');
});

const getSalesRefUsersWithDetails = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const data = await authService.getSalesRefUsersWithDetails(branchId);
  return success(res, data, 'SalesRef users data retrieved successfully');
});

const getSalesRefUsersTeam = asyncHandler(async (req, res) => {
  const { contractingHeadId } = req.query;
  const data = await authService.getSalesRefUsersTeam(contractingHeadId);
  return success(res, data, 'Contracting team users retrieved successfully');
});

/**
 * Switch active role
 */
const switchRole = asyncHandler(async (req, res) => {
  const { roleId } = req.body;
  const token = await authService.switchRole(req.userId, roleId);
  return success(res, { token }, 'Role switched successfully');
});

module.exports = {
  login,
  register,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  getProfile,
  getUserInfo,
  getSalesRefUsersWithDetails,
  getSalesRefUsersTeam,
  switchRole
};
