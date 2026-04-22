/**
 * User Service
 * Business logic for User management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');
const crypto = require('crypto');
const { sendWelcomeEmail } = require('./mail.service');

const getUserList = async () => {
  const users = await prisma.appUser.findMany({
    where: {
      isActive: true
    },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      email: true,
      mobile: true,
      employeeCode: true,
      designationId: true,
      branchId: true,
      travelAgencyId: true,
      travelAgency: true,
      designation: true,
      travel_agency_branch: {
        include: {
          city: true
        }
      },
      isActive: true,
      createdAt: true,
      app_user_app_user_primary_manager_user_idToapp_user: {
        select: {
          firstName: true,
          lastName: true,
          designation: true
        }
      },
      userRoles: {
        select: {
          roleId: true,
          role: true
        }
      },
      modifiedLeads: true,
      salesLeads: true,
      contractingLeads: true,
      contractingTeamMembers: true,
      createdDestinations: true,
      modifiedDestinations: true,
      createdPickups: true,
      createdTripInfo: true,
      modifiedTripInfo: true,
    }
  });
  return users;
};


/**
 * Get User list
 */
const getUserTravelAgencyById = async (travelAgencyId) => {
  const User = await prisma.appUser.findMany({
    where: {
      travelAgencyId,
      isActive: true
    },
    select: {
      userId: true, travelAgencyId: true, branchId: true, designationId: true, employeeCode: true, firstName: true,
      lastName: true, email: true, mobile: true, isActive: true, createdAt: true, travelAgency: true, branch: true, designation: true, loginSessions: true, userRoles: true, modifiedLeads: true, salesLeads: true, contractingLeads: true, contractingTeamMembers: true, createdDestinations: true, modifiedDestinations: true, createdServices: true, createdPickups: true, createdTripInfo: true, modifiedTripInfo: true,
    },
  });

  if (!User) {
    throw new NotFoundError('User');
  }
  return User;
};

// add user & upadte User
const addUser = async (data) => {
  console.log('--- USER SERVICE: ADD OR UPDATE ---');
  console.log('Payload Data:', JSON.stringify(data, null, 2));

  // Determine if this is an update or a new creation
  const isUpdate = !!(data.userId && data.userId.length > 5);

  if (isUpdate) {
    console.log(`[UPDATE] Target User ID: ${data.userId}`);
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the base user record
      const updatedUser = await tx.appUser.update({
        where: { userId: data.userId },
        data: {
          travelAgencyId: data.travelAgencyId,
          branchId: data.branchId,
          designationId: data.designationId,
          employeeCode: data.employeeCode,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          mobile: data.mobile,
          isActive: data.isActive,
        }
      });

      // 2. Handle Role Update (Delete existing and create new for simplicity/atomicity)
      if (data.roleId) {
        await tx.userRole.deleteMany({
          where: { userId: updatedUser.userId }
        });

        await tx.userRole.create({
          data: {
            userId: updatedUser.userId,
            roleId: data.roleId
          }
        });
      }

      return updatedUser;
    });

    console.log('[UPDATE] Success for:', result.userId);
    return result;
  } else {
    console.log('[CREATE] New user process started');
    // insert
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the base user
      const newUser = await tx.appUser.create({
        data: {
          travelAgencyId: data.travelAgencyId,
          branchId: data.branchId,
          designationId: data.designationId,
          employeeCode: data.employeeCode,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          mobile: data.mobile,
          isActive: data.isActive,
        }
      });

      // 2. Assign the Role
      if (data.roleId) {
        await tx.userRole.create({
          data: {
            userId: newUser.userId,
            roleId: data.roleId
          }
        });
      }

      // 3. Initialize Auth (Temporary random password)
      const tempHash = crypto.randomBytes(16).toString('hex');
      await tx.appUserAuth.create({
        data: {
          userId: newUser.userId,
          passwordHash: tempHash,
          isLocked: false
        }
      });

      // 4. Generate Setup Token (Password Reset)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours link

      await tx.appUserPasswordReset.create({
        data: {
          userId: newUser.userId,
          resetToken: resetToken,
          expiresAt: expiresAt
        }
      });

      return { newUser, resetToken };
    });

    // Send the welcome email (Async, outside transaction)
    try {
      if (result.newUser.email) {
        await sendWelcomeEmail(result.newUser.email, result.resetToken, result.newUser.firstName);
        console.log('[CREATE] Welcome email dispatched to:', result.newUser.email);
      }
    } catch (mailError) {
      console.error('[CREATE] Email dispatch failed:', mailError.message);
    }

    return result.newUser;
  }
};


const deleteUser = async (data) => {
  const user = await prisma.appUser.updateMany({
    where: {
      userId: {
        in: data.userIds
      }
    },
    data: {
      isActive: data.isActive,
    }
  });
  if (!user) {
    throw new NotFoundError('user');
  }
  return user;
};

/**
 * Get users by designation ID
 */
const getUsersByDesignationId = async (designationId) => {
  const users = await prisma.appUser.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            roleCode: {
              in: ['OPS'],
            },
          },
        },
      },
      isActive: true,
    },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      email: true,
      mobile: true,
      employeeCode: true,
      designationId: true,
      branchId: true,
      travelAgencyId: true
    }
  });

  return users;
};


/**
 * Get all direct and indirect subordinates of a manager recursively
 * If isAdmin is true, returns the entire hierarchy starting from top-level users
 * Uses PostgreSQL Recursive CTE for efficiency
 */
const getSubordinatesRecursive = async (managerId, isAdmin = false) => {
  if (isAdmin) {
    // Admin sees everything starting from top-level managers (manager_id IS NULL)
    return await prisma.$queryRaw`
      WITH RECURSIVE subordinates_cte AS (
        SELECT user_id, first_name, last_name, email, designation_id, primary_manager_user_id, 1 as depth
        FROM app_user
        WHERE primary_manager_user_id IS NULL AND is_active = true
        UNION ALL
        SELECT u.user_id, u.first_name, u.last_name, u.email, u.designation_id, u.primary_manager_user_id, s.depth + 1
        FROM app_user u
        INNER JOIN subordinates_cte s ON u.primary_manager_user_id = s.user_id
        WHERE u.is_active = true
      )
      SELECT s.user_id as "userId", s.first_name as "firstName", s.last_name as "lastName", s.email, s.designation_id as "designationId", s.primary_manager_user_id as "primaryManagerUserId", s.depth, d.designation_name as "designationName"
      FROM subordinates_cte s
      LEFT JOIN master_designation d ON s.designation_id = d.designation_id
      ORDER BY s.depth, s.first_name;
    `;
  } else {
    // Managers see only their subordinates
    return await prisma.$queryRaw`
      WITH RECURSIVE subordinates_cte AS (
        SELECT user_id, first_name, last_name, email, designation_id, primary_manager_user_id, 1 as depth
        FROM app_user
        WHERE primary_manager_user_id = ${managerId}::uuid AND is_active = true
        UNION ALL
        SELECT u.user_id, u.first_name, u.last_name, u.email, u.designation_id, u.primary_manager_user_id, s.depth + 1
        FROM app_user u
        INNER JOIN subordinates_cte s ON u.primary_manager_user_id = s.user_id
        WHERE u.is_active = true
      )
      SELECT s.user_id as "userId", s.first_name as "firstName", s.last_name as "lastName", s.email, s.designation_id as "designationId", s.primary_manager_user_id as "primaryManagerUserId", s.depth, d.designation_name as "designationName"
      FROM subordinates_cte s
      LEFT JOIN master_designation d ON s.designation_id = d.designation_id
      ORDER BY s.depth, s.first_name;
    `;
  }
};


const getNextEmployeeCode = async () => {
  const users = await prisma.appUser.findMany({
    where: {
      employeeCode: {
        not: null
      }
    },
    select: { employeeCode: true },
  });

  if (users.length === 0) {
    return 'EMP-001';
  }

  const codes = users
    .map(u => {
      const match = u.employeeCode ? u.employeeCode.match(/\d+/) : null;
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter(n => n > 0);

  if (codes.length === 0) {
    return 'EMP-001';
  }

  const maxCode = Math.max(...codes);
  return `EMP-${(maxCode + 1).toString().padStart(3, '0')}`;
};


module.exports = {
  getUserTravelAgencyById,
  addUser,
  deleteUser,
  getUsersByDesignationId,
  getUserList,
  getSubordinatesRecursive,
  getNextEmployeeCode,
};
