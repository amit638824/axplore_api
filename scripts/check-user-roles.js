/**
 * Script to check user roles and relationships
 * Run: node scripts/check-user-roles.js <userId>
 */

require('dotenv').config();
const { prisma } = require('../src/config/database');

async function checkUserRoles(userId) {
  try {
    console.log(`\nChecking roles for user: ${userId}\n`);

    // Check user_role table
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
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
    });

    console.log(`Found ${userRoles.length} role(s) assigned to user:\n`);

    if (userRoles.length === 0) {
      console.log('❌ No roles assigned to this user!');
      console.log('\nTo assign a role, insert into user_role table:');
      console.log('INSERT INTO user_role (user_id, role_id) VALUES (\'userId\', \'roleId\');\n');
      
      // Show available roles
      const allRoles = await prisma.role.findMany({
        where: { isActive: true },
        select: {
          roleId: true,
          roleCode: true,
          roleName: true,
        },
      });
      
      console.log('Available roles:');
      allRoles.forEach((role) => {
        console.log(`  - ${role.roleName} (${role.roleCode}): ${role.roleId}`);
      });
    } else {
      userRoles.forEach((userRole, index) => {
        console.log(`${index + 1}. Role: ${userRole.role.roleName} (${userRole.role.roleCode})`);
        console.log(`   Permissions: ${userRole.role.rolePermissions.length}`);
        
        userRole.role.rolePermissions.forEach((rp) => {
          const perm = rp.permission;
          const subMenu = perm.subMenu;
          const menu = subMenu?.menu;
          
          console.log(`   - ${perm.permissionName} (${perm.permissionCode})`);
          if (subMenu) {
            console.log(`     SubMenu: ${subMenu.subMenuName} (${subMenu.subMenuCode})`);
          }
          if (menu) {
            console.log(`     Menu: ${menu.menuName} (${menu.menuCode})`);
          }
        });
        console.log('');
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts/check-user-roles.js <userId>');
  process.exit(1);
}

checkUserRoles(userId);
