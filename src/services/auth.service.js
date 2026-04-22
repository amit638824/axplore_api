/**
 * Authentication Service
 * Business logic for authentication operations
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../config/database');
const { AuthenticationError, NotFoundError, ConflictError } = require('../utils/errors');
const { JWT } = require('../config/constants');
const { sendResetEmail, sendPasswordSuccessEmail } = require('./mail.service');

/**
 * Generate JWT token
 */

const generateToken = (userId, activeRoleId) => {
  return jwt.sign({ userId, activeRoleId }, "aZr9LmQwXcT5vHk8YpN2sFdGe7JuRbCxWtV3oPlK", {
    expiresIn: "24h",
  });
};

/**
 * Hash password
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Login user - bypasses unique constraint errors and generates token
 */
const login = async (email, password, deviceInfo) => {
  // Find user by email
  console.log("email", email);
  const user = await prisma.appUser.findFirst({
    where: {
      isActive: true,
      OR: [
        // { email: email },
        // { employeeCode: email },
        // { mobile: email }
        { email: { equals: email, mode: "insensitive" } },
        { employeeCode: { equals: email, mode: "insensitive" } },
        { mobile: { equals: email, mode: "insensitive" } }  // optional if mobile needs case-insensitive

      ]
    },
    include: {
      auth: true,
      travelAgency: true,
      travel_agency_branch: true,
      designation: true,
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  console.log("user", user);
  if (!user || !user.auth) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Check if account is locked
  // if (user.auth.isLocked) {
  //   throw new AuthenticationError('Account is locked. Please contact administrator.');
  // }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.auth.passwordHash);
  if (!isPasswordValid) {
    // Increment failed login attempts
    const failedAttempts = (user.auth.failedLoginAttempts || 0) + 1;
    const isLocked = failedAttempts >= 50000;

    await prisma.appUserAuth.update({
      where: { userId: user.userId },
      data: {
        failedLoginAttempts: failedAttempts,
        isLocked: isLocked,
      },
    }).catch(() => {
      // Ignore update errors
    });

    throw new AuthenticationError('Invalid email or password');
  }

  // Reset failed login attempts on successful login
  await prisma.appUserAuth.update({
    where: { userId: user.userId },
    data: {
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
    },
  }).catch(() => {
    // Ignore update errors
  });

  // Create login session - handle unique constraint errors gracefully
  let session;
  // try {
  //   session = await prisma.appUserLoginSession.create({
  //     data: {
  //       userId: user.userId,
  //       deviceId: deviceInfo.deviceId,
  //       deviceType: deviceInfo.deviceType,
  //       deviceName: deviceInfo.deviceName,
  //       appVersion: deviceInfo.appVersion,
  //       ipAddress: deviceInfo.ipAddress,
  //       userAgent: deviceInfo.userAgent,
  //     },
  //   });
  // } catch (error) {
  //   // If unique constraint error (P2002), try to find existing session or create with different deviceId
  //   if (error.code === 'P2002') {
  //     // Try to find existing active session for this device
  //     const existingSession = await prisma.appUserLoginSession.findFirst({
  //       where: {
  //         userId: user.userId,
  //         deviceId: deviceInfo.deviceId,
  //         isActive: true,
  //       },
  //     });

  //     if (existingSession) {
  //       // Update existing session
  //       session = await prisma.appUserLoginSession.update({
  //         where: { loginSessionId: existingSession.loginSessionId },
  //         data: {
  //           loginAt: new Date(),
  //           lastActivityAt: new Date(),
  //           isActive: true,
  //           logoutAt: null,
  //         },
  //       });
  //     } else {
  //       // Create new session with modified deviceId to avoid conflict
  //       const modifiedDeviceId = `${deviceInfo.deviceId}-${Date.now()}`;
  //       session = await prisma.appUserLoginSession.create({
  //         data: {
  //           userId: user.userId,
  //           deviceId: modifiedDeviceId,
  //           deviceType: deviceInfo.deviceType,
  //           deviceName: deviceInfo.deviceName,
  //           appVersion: deviceInfo.appVersion,
  //           ipAddress: deviceInfo.ipAddress,
  //           userAgent: deviceInfo.userAgent,
  //         },
  //       });
  //     }
  //   } else {
  //     // For other errors, try to create session without deviceId constraint
  //     try {
  //       const modifiedDeviceId = `${deviceInfo.deviceId}-${Date.now()}-${Math.random()}`;
  //       session = await prisma.appUserLoginSession.create({
  //         data: {
  //           userId: user.userId,
  //           deviceId: modifiedDeviceId,
  //           deviceType: deviceInfo.deviceType,
  //           deviceName: deviceInfo.deviceName,
  //           appVersion: deviceInfo.appVersion,
  //           ipAddress: deviceInfo.ipAddress,
  //           userAgent: deviceInfo.userAgent,
  //         },
  //       });
  //     } catch (createError) {
  //       // If still fails, generate token without session (fallback)
  //       console.warn('Could not create login session, generating token without session:', createError.message);
  //       const token = generateToken(user.userId);
  //       return { token };
  //     }
  //   }
  // }

  // Determine Active Role (Highest priority - lowest hierarchy number)
  let activeRoleId = null;
  if (user.userRoles && user.userRoles.length > 0) {
    const sortedRoles = [...user.userRoles].sort((a, b) => (a.role?.hierarchy || 999) - (b.role?.hierarchy || 999));
    activeRoleId = sortedRoles[0].roleId;
  }

  // Generate token
  const token = generateToken(user.userId, activeRoleId);

  return {
    token,
    sessionId: session?.loginSessionId,
  };
};

/**
 * Register new user - if email exists, log them in instead
 */
const register = async (userData, deviceInfo = null) => {
  // Check if email already exists
  const existingUser = await prisma.appUser.findFirst({
    where: {
      email: userData.email.toLowerCase(),
    },
    include: {
      auth: true,
    },
  });

  // If user exists, verify password and log them in
  if (existingUser && existingUser.auth) {
    const isPasswordValid = await comparePassword(userData.password, existingUser.auth.passwordHash);

    if (isPasswordValid && deviceInfo) {
      // Log them in
      return await login(userData.email, userData.password, deviceInfo);
    } else if (isPasswordValid) {
      // Generate token without session
      // For register fallback login, we need to load roles too or pick first.
      // Small hack: just use null if not loaded, but ideally we'd load roles.
      // But register is usually for new users who don't have roles yet.
      const token = generateToken(existingUser.userId, null);
      return { token, isExistingUser: true };
    } else {
      throw new AuthenticationError('Email already registered. Please use login with correct password.');
    }
  }

  // Hash password
  const passwordHash = await hashPassword(userData.password);

  // Create user and auth record - handle unique constraint errors
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.appUser.create({
        data: {
          travelAgencyId: userData.travelAgencyId,
          branchId: userData.branchId,
          designationId: userData.designationId,
          employeeCode: userData.employeeCode,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email.toLowerCase(),
          mobile: userData.mobile,
          isActive: true,
        },
      });

      await tx.appUserAuth.create({
        data: {
          userId: newUser.userId,
          passwordHash,
        },
      });

      return newUser;
    });
  } catch (error) {
    // If unique constraint error, try to log in instead
    if (error.code === 'P2002') {
      const existingUser = await prisma.appUser.findFirst({
        where: {
          email: userData.email.toLowerCase(),
        },
        include: {
          auth: true,
        },
      });

      if (existingUser && existingUser.auth) {
        const isPasswordValid = await comparePassword(userData.password, existingUser.auth.passwordHash);

        if (isPasswordValid && deviceInfo) {
          return await login(userData.email, userData.password, deviceInfo);
        } else if (isPasswordValid) {
          const token = generateToken(existingUser.userId);
          return { token, isExistingUser: true };
        }
      }
    }

    // Re-throw if not handled
    throw error;
  }

  // Create login session if deviceInfo provided
  let session = null;
  if (deviceInfo) {
    try {
      session = await prisma.appUserLoginSession.create({
        data: {
          userId: user.userId,
          deviceId: deviceInfo.deviceId,
          deviceType: deviceInfo.deviceType,
          deviceName: deviceInfo.deviceName,
          appVersion: deviceInfo.appVersion,
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
        },
      });
    } catch (error) {
      // Ignore session creation errors, token will still be generated
      console.warn('Could not create login session:', error.message);
    }
  }

  // Generate token
  const token = generateToken(user.userId);

  return {
    token,
    sessionId: session?.loginSessionId,
    isExistingUser: false,
  };
};

/**
 * Change password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const auth = await prisma.appUserAuth.findUnique({
    where: { userId },
    include: {
      user: true,
    },
  });

  if (!auth || !auth.user) {
    throw new NotFoundError('User authentication record');
  }

  // Verify current password
  const isPasswordValid = await comparePassword(currentPassword, auth.passwordHash);
  if (!isPasswordValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  await prisma.appUserAuth.update({
    where: { userId },
    data: {
      passwordHash,
      updatedAt: new Date(),
    },
  });

  // Send success confirmation email
  if (auth.user.email) {
    try {
      await sendPasswordSuccessEmail(auth.user.email, auth.user.firstName);
    } catch (error) {
      console.error('Error sending password success email from changePassword:', error.message);
    }
  }

  return { message: 'Password changed successfully' };
};

/**
 * Forgot password - generate reset token
 */
const forgotPassword = async (email, requestedIp = null, requestedUserAgent = null) => {
  console.log('--- FORGOT PASSWORD SERVICE CALLED ---');
  console.log('Searching for user with identifier:', email);

  const user = await prisma.appUser.findFirst({
    where: {
      isActive: true,
      OR: [
        { email: { equals: email.toLowerCase().trim(), mode: 'insensitive' } },
        { employeeCode: { equals: email.trim(), mode: 'insensitive' } },
        { mobile: { equals: email.trim() } }
      ]
    },
  });

  if (!user) {
    console.log('USER NOT FOUND for identifier:', email);
    // User specifically requested to check if email exists or not
    throw new NotFoundError('No account found with this email / identifier');
  }

  console.log('USER FOUND:', { userId: user.userId, email: user.email, firstName: user.firstName });

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry as requested

  const resetRecord = await prisma.appUserPasswordReset.create({
    data: {
      userId: user.userId,
      resetToken,
      expiresAt,
      requestedIp,
      requestedUserAgent,
    },
  });

  console.log('--- PASSWORD RESET RECORD SAVED ---');
  console.log(JSON.stringify(resetRecord, null, 2));
  console.log('------------------------------------');

  // Send email with reset token
  try {
    await sendResetEmail(user.email, resetToken, user.firstName);
  } catch (error) {
    console.error('FAILED TO SEND RESET EMAIL IN SERVICE:', error.message);
    // Log the full error to help debugging
    console.error(error);
  }

  return {
    message: 'If the email exists, a password reset link has been sent',
    // In development, we can return the token for easier testing
    resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
  };
};

/**
 * Reset password using token
 */
const resetPassword = async (token, newPassword) => {
  const passwordReset = await prisma.appUserPasswordReset.findFirst({
    where: {
      resetToken: token,
      usedAt: null,
    },
    include: {
      user: true,
    },
  });

  if (!passwordReset) {
    throw new AuthenticationError('Invalid or expired reset token');
  }

  if (new Date() > passwordReset.expiresAt) {
    throw new AuthenticationError('Reset token has expired');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password and mark token as used
  await prisma.$transaction(async (tx) => {
    await tx.appUserAuth.update({
      where: { userId: passwordReset.userId },
      data: { passwordHash },
    });

    await tx.appUserPasswordReset.update({
      where: { passwordResetId: passwordReset.passwordResetId },
      data: { usedAt: new Date() },
    });
  });

  // Send success confirmation email
  if (passwordReset.user && passwordReset.user.email) {
    try {
      await sendPasswordSuccessEmail(passwordReset.user.email, passwordReset.user.firstName);
    } catch (error) {
      console.error('Error sending password success email:', error.message);
    }
  }

  return { message: 'Password reset successfully' };
};

/**
 * Logout user
 */
const logout = async (userId, sessionId = null, deviceId = null, ipAddress = null) => {
  const logoutTime = new Date();

  if (sessionId) {
    await prisma.appUserLoginSession.updateMany({
      where: {
        loginSessionId: sessionId,
        userId: userId,
        isActive: true,
      },
      data: {
        isActive: false,
        logoutAt: logoutTime,
      },
    }).catch(() => {
      // Ignore errors
    });
  } else {
    // Find and logout most recent active session
    let whereClause = {
      userId: userId,
      isActive: true,
    };

    if (deviceId) {
      whereClause.deviceId = deviceId;
    } else if (ipAddress) {
      whereClause.ipAddress = ipAddress;
    }

    const activeSession = await prisma.appUserLoginSession.findFirst({
      where: whereClause,
      orderBy: { loginAt: 'desc' },
    });

    if (activeSession) {
      await prisma.appUserLoginSession.update({
        where: { loginSessionId: activeSession.loginSessionId },
        data: {
          isActive: false,
          logoutAt: logoutTime,
        },
      }).catch(() => {
        // Ignore errors
      });
    } else {
      // Logout all active sessions
      await prisma.appUserLoginSession.updateMany({
        where: {
          userId: userId,
          isActive: true,
        },
        data: {
          isActive: false,
          logoutAt: logoutTime,
        },
      }).catch(() => {
        // Ignore errors
      });
    }
  }

  return { message: 'Logged out successfully' };
};

/**
 * Logout all sessions
 */
const logoutAll = async (userId) => {
  const logoutTime = new Date();

  await prisma.appUserLoginSession.updateMany({
    where: {
      userId: userId,
      isActive: true,
    },
    data: {
      isActive: false,
      logoutAt: logoutTime,
      terminatedReason: 'User logged out all sessions',
    },
  }).catch(() => {
    // Ignore errors
  });

  return { message: 'All sessions logged out successfully' };
};

/**
 * Get user info with menus and submenus ...
 */
const getUserInfoWithMenus = async (userId, roleId = null) => {
  // First, explicitly check user_role table
  const userRoleRecords = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            where: {
              permission: {
                subMenu: {
                  menu: { isActive: true },
                },
              },
            },
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
  });

  // Debug: Log user_role table check
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n[DEBUG] Checking user_role table for userId: ${userId}`);
    console.log(`[DEBUG] Found ${userRoleRecords.length} role(s) in user_role table`);
    userRoleRecords.forEach((ur, index) => {
      console.log(`[DEBUG] Role ${index + 1}: ${ur.roleId} - ${ur.role?.roleName || 'N/A'}`);
    });
  }

  // Get user information
  const user = await prisma.appUser.findUnique({
    where: { userId },
    select: {
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      mobile: true,
      employeeCode: true,
      isActive: true,
      createdAt: true,
      travelAgency: {
        select: {
          travelAgencyId: true,
          name: true,
          email: true,
          phone: true,
          websiteUrl: true,
        },
      },
      travel_agency_branch: {
        select: {
          branchId: true,
          branchName: true,
          branchCode: true,
          phone: true,
          email: true,
          city: {
            select: {
              cityId: true,
              name: true,
            },
          },
          state: {
            select: {
              stateId: true,
              name: true,
            },
          },
          country: {
            select: {
              countryId: true,
              name: true,
            },
          },
        },
      },
      designation: {
        select: {
          designationId: true,
          designationCode: true,
          designationName: true,
        },
      },
      userRoles: {
        select: {
          userId: true,
          roleId: true,
          role: {
            select: {
              roleId: true,
              roleCode: true,
              roleName: true,
              description: true,
              hierarchy: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: {
                      permissionId: true,
                      permissionCode: true,
                      permissionName: true,
                      description: true,
                      subMenu: {
                        select: {
                          subMenuId: true,
                          subMenuCode: true,
                          subMenuName: true,
                          routePath: true,
                          displayOrder: true,
                          isActive: true,
                          menu: {
                            select: {
                              menuId: true,
                              menuCode: true,
                              menuName: true,
                              displayOrder: true,
                              icon: true,
                              isActive: true,
                            },
                          },
                        },
                      },
                      isActive: true,
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
    throw new NotFoundError('User');
  }

  // Debug: Log userRoles from both queries
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] User Roles from user.userRoles: ${user.userRoles?.length || 0}`);
    console.log(`[DEBUG] User Roles from user_role table query: ${userRoleRecords.length}`);

    if (user.userRoles?.length === 0 && userRoleRecords.length > 0) {
      console.warn('[WARNING] user_role table has records but user.userRoles is empty!');
      console.warn('[WARNING] This might indicate a Prisma relation issue.');
    }
  }

  // Use userRoleRecords if user.userRoles is empty but userRoleRecords has data
  const rolesToProcess = user.userRoles && user.userRoles.length > 0
    ? user.userRoles
    : userRoleRecords.map(ur => ({
      userId: ur.userId,
      roleId: ur.roleId,
      role: ur.role,
    }));

  // Organize menus and submenus
  const menuMap = new Map();
  const permissions = new Set();

  // Process user roles and their permissions
  // Strictly filter rolesToProcess to ONLY include the requested active role
  let filteredRoles = rolesToProcess;
  const targetRoleId = (roleId && roleId !== 'null' && roleId !== 'undefined') ? roleId : null;

  if (targetRoleId) {
    filteredRoles = rolesToProcess.filter(ur => ur.roleId === targetRoleId);
    // If targetRoleId was provided but not found among user roles, fall back to default
    if (filteredRoles.length === 0 && rolesToProcess.length > 0) {
      const sortedRoles = [...rolesToProcess].sort((a, b) => (a.role?.hierarchy || 999) - (b.role?.hierarchy || 999));
      filteredRoles = [sortedRoles[0]];
    }
  } else if (rolesToProcess && rolesToProcess.length > 0) {
    // Auto-select based on hierarchy (1 is highest priority)
    const sortedRoles = [...rolesToProcess].sort((a, b) => (a.role?.hierarchy || 999) - (b.role?.hierarchy || 999));
    filteredRoles = [sortedRoles[0]];
  }

  if (filteredRoles && filteredRoles.length > 0) {
    filteredRoles.forEach((userRole) => {
      if (userRole.role && userRole.role.rolePermissions) {
        userRole.role.rolePermissions.forEach((rolePermission) => {
          if (rolePermission.permission && rolePermission.permission.isActive !== false) {
            const permission = rolePermission.permission;
            permissions.add(permission.permissionCode);

            if (permission.subMenu && permission.subMenu.isActive !== false) {
              const subMenu = permission.subMenu;

              if (subMenu.menu && subMenu.menu.isActive !== false) {
                const menu = subMenu.menu;

                if (!menuMap.has(menu.menuId)) {
                  menuMap.set(menu.menuId, {
                    menuId: menu.menuId,
                    menuCode: menu.menuCode,
                    menuName: menu.menuName,
                    displayOrder: menu.displayOrder,
                    icon: menu.icon,
                    subMenus: new Map(),
                  });
                }

                const menuData = menuMap.get(menu.menuId);
                if (!menuData.subMenus.has(subMenu.subMenuId)) {
                  menuData.subMenus.set(subMenu.subMenuId, {
                    subMenuId: subMenu.subMenuId,
                    subMenuCode: subMenu.subMenuCode,
                    subMenuName: subMenu.subMenuName,
                    routePath: subMenu.routePath,
                    displayOrder: subMenu.displayOrder,
                    permissions: [],
                  });
                }

                const subMenuData = menuData.subMenus.get(subMenu.subMenuId);
                subMenuData.permissions.push({
                  permissionId: permission.permissionId,
                  permissionCode: permission.permissionCode,
                  permissionName: permission.permissionName,
                  description: permission.description,
                });
              }
            }
          }
        });
      }
    });
  }

  // Convert maps to arrays and sort
  const menus = Array.from(menuMap.values())
    .map((menu) => ({
      ...menu,
      subMenus: Array.from(menu.subMenus.values())
        .map((subMenu) => ({
          ...subMenu,
          permissions: subMenu.permissions,
        }))
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    }))
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Remove sensitive data
  const userData = {
    userId: user.userId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    mobile: user.mobile,
    employeeCode: user.employeeCode,
    isActive: user.isActive,
    travelAgency: user.travelAgency,
    branch: user.travel_agency_branch,
    designation: user.designation,
    roles: rolesToProcess && rolesToProcess.length > 0
      ? rolesToProcess
        .filter((ur) => ur.role) // Filter out any null roles
        .map((ur) => ({
          roleId: ur.role.roleId,
          roleCode: ur.role.roleCode,
          roleName: ur.role.roleName,
          description: ur.role.description,
          hierarchy: ur.role.hierarchy,
        }))
      : [],
    menus: menus,
    permissions: Array.from(permissions),
    activeRoleId: filteredRoles && filteredRoles.length > 0 ? filteredRoles[0].roleId : null,
  };

  return userData;
};

const getSalesRefUsersWithDetails = async (branchId = null) => {
  const SALES_REF_ROLE_ID = '2afc4886-ecb1-4889-9494-d321dc9be29c';
  const CONTRACTING_TEAM_DESIGNATION_ID = 'b1b3339e-9111-4a37-9876-570cae87a95f';

  // Get users from user_branch_mapping if branchId is provided
  let mappedUserIds = [];
  if (branchId) {
    const mappings = await prisma.user_branch_mapping.findMany({
      where: {
        branch_id: branchId,
        is_active: true
      },
      select: { user_id: true }
    });
    mappedUserIds = mappings.map(m => m.user_id).filter(id => id);
  }

  // Define common where clause for users
  const userFilter = branchId
    ? {
      OR: [
        { branchId: branchId },
        { userId: { in: mappedUserIds } }
      ]
    }
    : {};

  // Get all users with SalesRef role
  const salesRefUsers = await prisma.appUser.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            roleCode: {
              in: ['SALES'],
            },
          },
        },
      },
      isActive: true,
      ...userFilter,
    },
    include: {
      travel_agency_branch: true,
      designation: true,
      travelAgency: true,
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  // Get all branches
  const allBranches = await prisma.travelAgencyBranch.findMany({
    where: {
      isActive: true,
      ...(branchId ? { branchId } : {}),
    },
  });

  // Get all Contracting Head users
  const contractingHeads = await prisma.appUser.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            roleCode: {
              in: ['CONTRACTORSALES'],
            },
          },
        },
      },
      ...userFilter,
    },
    include: {
      travel_agency_branch: true,
    },
  });

  // Get all Contracting Team members
  const contractingTeams = await prisma.appUser.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            roleCode: {
              in: ['CONTRACTOR'],
            },
          },
        },
      },
      ...userFilter,
    },
    include: {
      travel_agency_branch: true,
    },
  });

  // Format results to include branch info consistently
  const formatUser = (user) => ({
    userId: user.userId,
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
    branch: user.travel_agency_branch
      ? {
        branchId: user.travel_agency_branch.branchId,
        branchName: user.travel_agency_branch.branchName,
        branchCode: user.travel_agency_branch.branchCode,
      }
      : null,
  });

  // Format branches
  const formattedBranches = allBranches.map((branch) => ({
    branchId: branch.branchId,
    branchName: branch.branchName,
    branchCode: branch.branchCode,
  }));

  return {
    salesRefUsers: salesRefUsers.map(formatUser),
    branches: formattedBranches,
    contractingHeads: contractingHeads.map(formatUser),
    contractingTeams: contractingTeams.map(formatUser),
  };
};
const getSalesRefUsersTeam = async (contractingHeadId) => {
  if (!contractingHeadId) {
    return { contractingTeams: [] };
  }

  // Get users whose primary_manager_user_id = contractingHeadId
  const contractingTeams = await prisma.appUser.findMany({
    where: {
      primary_manager_user_id: contractingHeadId,
      isActive: true,
    },
    include: {
      travel_agency_branch: true,
    },
  });

  const formattedTeams = contractingTeams.map((user) => ({
    userId: user.userId,
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
    branch: user.travel_agency_branch
      ? {
        branchId: user.travel_agency_branch.branchId,
        branchName: user.travel_agency_branch.branchName,
        branchCode: user.travel_agency_branch.branchCode,
      }
      : null,
  }));

  return {
    contractingTeams: formattedTeams,
  };
};

const switchRole = async (userId, roleId) => {
  // Verify user has this role
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      roleId,
    },
    include: {
      role: true,
    },
  });

  if (!userRole) {
    throw new AuthenticationError('You do not have permission for this role');
  }

  // Generate new token with new activeRoleId
  const token = generateToken(userId, roleId);
  return token;
};

module.exports = {
  login,
  register,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  logoutAll,
  getUserInfoWithMenus,
  generateToken,
  hashPassword,
  comparePassword,
  generateOTP,
  getSalesRefUsersWithDetails,
  getSalesRefUsersTeam,
  switchRole
};
