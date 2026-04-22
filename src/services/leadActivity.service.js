const { prisma } = require("../config/database");

const getTeamUserIds = async (userId) => {
  const result = [];
  const visited = new Set();

  const fetchTeam = async (ids) => {
    const users = await prisma.appUser.findMany({
      where: { primary_manager_user_id: { in: ids } },
      select: { userId: true },
    });

    const newIds = users.map(u => u.userId).filter(u => !visited.has(u));
    newIds.forEach(id => visited.add(id));
    if (newIds.length > 0) await fetchTeam(newIds);
    result.push(...newIds);
  };

  visited.add(userId);
  result.push(userId);
  await fetchTeam([userId]);
  return result;
};

const isAdmin = async (userId) => {
  const roles = await prisma.userRole.findMany({
    where: {
      userId,
      role: { roleCode: { equals: 'admin', mode: 'insensitive' } },
    },
    select: { roleId: true },
  });
  return roles.length > 0;
};

/**
 * Get Lead Activity Logs with pagination and filtering
 */
const getLeadActivityLogs = async (options = {}) => {
  const { page = 1, limit = 20, search = '', userId = null, action = null } = options;
  const skip = (page - 1) * limit;

  // Get hierarchy and admin status if userId is provided
  const teamUserIds = userId ? await getTeamUserIds(userId) : null;
  const admin = userId ? await isAdmin(userId) : false;

  const where = {
    AND: [
      search ? {
        OR: [
          { details: { contains: search, mode: 'insensitive' } },
          { action: { contains: search, mode: 'insensitive' } },
          { lead: { tripInfo: { tripName: { contains: search, mode: 'insensitive' } } } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
        ]
      } : {},
      (userId && !admin) ? {
        lead: {
          OR: [
            { createdBy: { in: teamUserIds } },
            { salesUserId: { in: teamUserIds } },
            { contractingHeadUserId: { in: teamUserIds } },
            { ops_head_user_id: { in: teamUserIds } },
            { contractingTeam: { some: { userId: { in: teamUserIds } } } },
          ]
        }
      } : {},
      action ? { action: action } : {},
    ]
  };

  const [total, data] = await Promise.all([
    prisma.leadActivityLog.count({ where }),
    prisma.leadActivityLog.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        lead: {
          select: {
            leadId: true,
            tripInfo: {
              select: {
                tripName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    })
  ]);

  return {
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  getLeadActivityLogs
};
