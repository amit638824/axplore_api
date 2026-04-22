/**
 * Division Service
 * Business logic for Division management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');

/**
 * Add division 
 */
const addDivision = async (data) => {
  // update
  console.log("data out side", data);
  if (data.divisionId) {
    console.log("data", data);
    const division = await prisma.corporateDivision.update({
      where: {
        divisionId: data.divisionId
      },
      data: {
        corporateId: data.corporateId,
        divisionCode: data.divisionCode,
        divisionName: data.divisionName,
        isActive: data.isActive
      }
    });
    if (!division) {
      throw new NotFoundError('division');
    }
    return division;
  } else {
    // insert
    const division = await prisma.corporateDivision.create({
      data: {
        corporateId: data.corporateId,
        divisionCode: data.divisionCode,
        divisionName: data.divisionName,
        isActive: data.isActive ?? true,
      }
    });
    if (!division) {
      throw new NotFoundError('division');
    }
    return division;
  }
};


const updateDivisionStatus = async (data) => {
  const result = await prisma.corporateDivision.updateMany({
    where: {
      divisionId: {
        in: data.divisionIds
      }
    },
    data: {
      isActive: data.isActive
    }
  });
  return result;
};




const getDivisionList = async ({ page = 1, limit = 1000, search, isActive }) => {

  const skip = (page - 1) * limit;

  const where = {
    AND: [
      search
        ? {
          OR: [
            { divisionName: { contains: search, mode: "insensitive" } },
            { divisionCode: { contains: search, mode: "insensitive" } },

            {
              corporate: {
                corporateName: {
                  contains: search,
                  mode: "insensitive"
                }
              }
            },
            {
              corporate: {
                corporateCode: {
                  contains: search,
                  mode: "insensitive"
                }
              }
            }
          ]
        }
        : {},

      isActive !== undefined
        ? { isActive: isActive }
        : {}
    ]
  };

  const [data, total] = await Promise.all([
    prisma.corporateDivision.findMany({
      where,
      skip,
      take: limit,
      include: {
        corporate: {
          select: {
            corporateId: true,
            corporateName: true,
            corporateCode: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),

    prisma.corporateDivision.count({ where })
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  getDivisionList,
  addDivision,
  updateDivisionStatus,

};
