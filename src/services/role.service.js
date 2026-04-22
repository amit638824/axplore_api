/**
 * Role Service
 * Business logic for Role management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');

const getRolesdata = async (search = "", page = 1, limit = 10, status = "all") => {
  const skip = (page - 1) * limit;
  const where = {
    ...(status !== "all" && { isActive: status === "Active" }),
    ...(search && {
      OR: [
        { roleName: { contains: search, mode: "insensitive" } },
        { roleCode: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      skip: skip,
      take: limit,
      orderBy: { roleName: "asc" },
      include: {
        _count: {
          select: { userRoles: true }
        },
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    }),
    prisma.role.count({ where }),
  ]);

  const rolesWithCount = roles.map(role => {
    const { _count, ...roleData } = role;
    return {
      ...roleData,
      userCount: _count?.userRoles || 0
    };
  });

  return {
    data: rolesWithCount,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getRoleById = async (roleId) => {
  const role = await prisma.role.findUnique({
    where: { roleId },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  });
  if (!role) throw new NotFoundError('Role not found');
  return role;
};

const createRole = async (data) => {
  const { roleName, roleCode, description, permissionIds } = data;

  // Check if role code exists
  const existing = await prisma.role.findUnique({ where: { roleCode } });
  if (existing) throw new ValidationError('Role code already exists');

  return await prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        roleName,
        roleCode,
        description,
        isActive: true
      }
    });

    if (permissionIds && permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map(id => ({
          roleId: role.roleId,
          permissionId: id
        }))
      });
    }

    return role;
  });
};

const updateRole = async (roleId, data) => {
  const { roleName, roleCode, description, permissionIds, isActive } = data;

  return await prisma.$transaction(async (tx) => {
    const role = await tx.role.update({
      where: { roleId },
      data: {
        roleName,
        roleCode,
        description,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    if (permissionIds !== undefined) {
      // Sync permissions: Delete old, add new
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map(id => ({
            roleId,
            permissionId: id
          }))
        });
      }
    }

    return role;
  });
};

const deleteRole = async (roleId) => {
  // Instead of hard delete, we usually soft delete or check for dependencies
  const userCount = await prisma.userRole.count({ where: { roleId } });
  if (userCount > 0) throw new ValidationError('Cannot delete role assigned to users');

  return await prisma.role.update({
    where: { roleId },
    data: { isActive: false }
  });
};

module.exports = {
  getRolesdata,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};
