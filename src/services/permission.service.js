/**
 * Permission Service
 * Logic to retrieve system permissions
 */

const { prisma } = require('../config/database');

const getAllPermissionsGrouped = async () => {
  const menus = await prisma.menu.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      subMenus: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          permissions: {
            where: { isActive: true },
            orderBy: { permissionName: 'asc' }
          }
        }
      }
    }
  });

  return menus;
};

module.exports = {
  getAllPermissionsGrouped
};
