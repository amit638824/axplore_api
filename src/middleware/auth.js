/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { prisma } = require('../config/database');
const { asyncHandler } = require('./errorHandler');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
  console.log("========== AUTH MIDDLEWARE START ==========");

  let token;

  // 🔹 Step 1: Check Authorization Header
  console.log("➡ Step 1: Checking Authorization Header...");
  console.log("Headers:", req.headers);

  if (req.headers.authorization) {
    console.log("Authorization Header Found:", req.headers.authorization);
  } else {
    console.log("❌ Authorization Header NOT Found");
  }

  // 🔹 Step 2: Check Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    console.log("➡ Step 2: Bearer Token Detected");
    token = req.headers.authorization.split(" ")[1];
    console.log("Extracted Token:", token);
  } else {
    console.log("❌ Bearer Token NOT Found");
  }

  // 🔹 Step 3: If No Token
  if (!token) {
    console.log("❌ No Token Provided");
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    // 🔹 Step 4: Verify Token
    console.log("➡ Step 4: Verifying JWT Token...");
    const decoded = jwt.verify(
      token,
      "aZr9LmQwXcT5vHk8YpN2sFdGe7JuRbCxWtV3oPlK"
    );

    console.log("✅ Token Verified Successfully");
    console.log("Decoded Data:", decoded);

    // 🔹 Step 5: Check Active Session
    console.log("➡ Step 5: Checking Active Session...");

    // const activeSession = await prisma.appUserLoginSession.findFirst({
    //   where: {
    //     userId: decoded.userId,
    //     isActive: true,
    //   },
    //   orderBy: {
    //     loginAt: "desc",
    //   },
    // });

    // if (!activeSession) {
    //   console.log("❌ No Active Session Found");
    //   return res.status(401).json({
    //     success: false,
    //     message: "Session expired. Please login again.",
    //   });
    // }

    // console.log("✅ Active Session Found:", activeSession.loginSessionId);

    // 🔹 Step 6: Fetch User
    console.log("➡ Step 6: Fetching User From DB...");

    const user = await prisma.appUser.findUnique({
      where: { userId: decoded.userId },
      include: {
        auth: true,
        travelAgency: true,
        travel_agency_branch: true,
        designation: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: {
                      include: {
                        subMenu: {
                          include: {
                            menu: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.log("❌ User Not Found In Database");
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ User Found:", user.userId);

    // 🔹 Step 7: Attach Data To Request
    req.user = user;
    req.userId = user.userId;
    
    // 🔹 Get active role from JWT token
    req.activeRoleId = decoded.activeRoleId || null;

    // 🔹 Fallback: If legacy token (no activeRoleId), auto-pick highest priority role
    if (!req.activeRoleId && user.userRoles && user.userRoles.length > 0) {
      const sortedRoles = [...user.userRoles].sort((a, b) => (a.role?.hierarchy || 999) - (b.role?.hierarchy || 999));
      req.activeRoleId = sortedRoles[0].roleId;
    }

    // 🔹 Pre-calculate isAdmin for the ACTIVE role for easy service-level checks
    const activeRole = user.userRoles.find(ur => ur.roleId === req.activeRoleId);
    if (activeRole) {
      req.user.activeRole = activeRole.role;
      req.user.isAdmin = ['admin', 'superadmin', 'super_admin', 'owner'].includes(activeRole.role.roleCode.toLowerCase());
    } else {
      req.user.isAdmin = false;
    }

    console.log("➡ Step 7: Updating Last Activity...");

    // await prisma.appUserLoginSession
    //   .update({
    //     where: { loginSessionId: activeSession.loginSessionId },
    //     data: { lastActivityAt: new Date() },
    //   })
    //   .then(() => {
    //     console.log("✅ Last Activity Updated");
    //   })
    //   .catch((err) => {
    //     console.log("⚠ Failed To Update Last Activity:", err.message);
    //   });

    console.log("========== AUTH SUCCESS ==========");
    next();
  } catch (error) {
    console.log("❌ ERROR IN AUTH MIDDLEWARE");
    console.log("Error Name:", error.name);
    console.log("Error Message:", error.message);
    console.log("Full Error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
});

/** dd
 * Check if user has required role(s)
 */
const authorize = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const activeRole = req.user.userRoles.find(ur => ur.roleId === req.activeRoleId);
    const roleCode = activeRole?.role?.roleCode;

    if (!roleCode || !roles.includes(roleCode)) {
      throw new AuthorizationError('You do not have permission to access this resource with your current role');
    }

    next();
  });
};

/**
 * Check if user has required permission
 */
const hasPermission = (permissionCode) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const activeRole = req.user.userRoles.find(ur => ur.roleId === req.activeRoleId);
    if (!activeRole) {
      throw new AuthorizationError('No active role context found');
    }

    const userPermissions = activeRole.role.rolePermissions.map((rp) => rp.permission.permissionCode);

    if (!userPermissions.includes(permissionCode)) {
      throw new AuthorizationError('You do not have permission to perform this action with your current role');
    }

    next();
  });
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
// const optionalAuth = asyncHandler(async (req, res, next) => {
//   let token;

//   if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//     token = req.headers.authorization.split(' ')[1];
//   }

// if (token) {
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

// Check if user has active session
// const activeSession = await prisma.appUserLoginSession.findFirst({
//   where: {
//     userId: decoded.userId,
//     isActive: true,
//   },
// });

//   if (activeSession) {
//     const user = await prisma.appUser.findUnique({
//       where: { userId: decoded.userId },
//       include: {
//         auth: true,
//         travelAgency: true,
//         branch: true,
//       },
//     });

//     if (user && user.isActive && !user.auth?.isLocked) {
//       req.user = user;
//       req.userId = user.userId;
//     }
//   }
// } catch (error) {
// Ignore token errors for optional auth
//   }
// }

//   next();
// });

module.exports = {
  authenticate,
  authorize,
  hasPermission,
  // optionalAuth,
};