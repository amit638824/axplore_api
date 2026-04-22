/**
 * Sub Division Service
 * Business logic for Sub Division management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');

/**
 * Get Sub Devision list
 */
const getCorporateSubDivisionById = async (divisionId) => {
  const CorporateSubDivision = await prisma.corporateSubDivision.findMany({
    where: {
      divisionId: divisionId && divisionId !== 'null' ? divisionId : undefined
    },
    select: {
      subDivisionId: true,
      divisionId: true,
      subDivisionName: true,
      subDivisionCode: true,
      websiteUrl: true,
      createdAt: true,
      isActive: true,
      division: true,
      addresses: true,
      contactPersons: true,
    },
  });

  if (!CorporateSubDivision) {
    throw new NotFoundError('CorporateSubDivision');
  }
  return CorporateSubDivision;
};



const getSubDivisionById = async (divisionId) => {
  const subDivision = await prisma.corporateSubDivision.findMany({
    where: {
      divisionId: divisionId && divisionId !== 'null' ? divisionId : undefined
    },
    select: {
      subDivisionId: true,
      divisionId: true,
      subDivisionName: true,
      subDivisionCode: true,
      websiteUrl: true,
      createdAt: true,
      isActive: true,
      division: true,
    }
  });

  return subDivision;
};



/**
 * Add Sub Division 
 */
const addSubDivision = async (data) => {
  // update
  if (data.subDivisionId) {
    const subdivision = await prisma.corporateSubDivision.update({
      where: {
        subDivisionId: data.subDivisionId
      },
      data: {
        divisionId: data.divisionId,
        subDivisionCode: data.subDivisionCode,
        subDivisionName: data.subDivisionName,
        websiteUrl: data.websiteUrl,
        isActive: data.isActive ?? true,
      }
    });
    if (!subdivision) {
      throw new NotFoundError('subdivision');
    }
    return subdivision;
  } else {
    // insert
    const subdivision = await prisma.corporateSubDivision.create({
      data: {
        divisionId: data.divisionId,
        subDivisionCode: data.subDivisionCode,
        subDivisionName: data.subDivisionName,
        websiteUrl: data.websiteUrl,
        isActive: data.isActive ?? true,
      }
    });
    if (!subdivision) {
      throw new NotFoundError('subdivision');
    }
    return subdivision;
  }
};

/**
 * Delete Sub Division 
 */


const deleteSubDivision = async (data) => {
  const result = await prisma.corporateSubDivision.updateMany({
    where: {
      subDivisionId: {
        in: data.subDivisionIds
      }
    },
    data: {
      isActive: data.isActive
    }
  });
  return result;
};



// corporate sub division address add an dupdate
const subDivisionAddress = async (data) => {
  // update
  if (data.subDivisionAddressId) {
    const subdivisionAddress = await prisma.corporateSubDivisionAddress.update({
      where: {
        subDivisionAddressId: data.subDivisionAddressId
      },
      data: {
        subDivisionId: data.subDivisionId,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        cityId: data.cityId,
        stateId: data.stateId,
        countryId: data.countryId,
        postalCode: data.postalCode,
        isPrimary: data.isPrimary,
        corporateId: data.corporateId,
        divisionId: data.divisionId,
        isActive: data.isActive ?? true,
      }
    });
    if (!subdivisionAddress) {
      throw new NotFoundError('subdivisionAddress');
    }
    return subdivisionAddress;
  } else {
    // insert
    const subdivisionAddress = await prisma.corporateSubDivisionAddress.create({
      data: {
        subDivisionId: data.subDivisionId,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        cityId: data.cityId,
        stateId: data.stateId,
        countryId: data.countryId,
        postalCode: data.postalCode,
        isPrimary: data.isPrimary,
        corporateId: data.corporateId,
        divisionId: data.divisionId,
        isActive: data.isActive ?? true,
      }
    });
    if (!subdivisionAddress) {
      throw new NotFoundError('subdivisionAddress');
    }
    return subdivisionAddress;
  }
};







const subDivisionAddressList = async ({
  divisionId,
  subDivisionId,
  page = 1,
  limit = 100,
  search = ""
}) => {

  const skip = (page - 1) * limit;

  const whereCondition = {
    ...(search && {
      OR: [
        { addressLine1: { contains: search, mode: "insensitive" } },
        { addressLine2: { contains: search, mode: "insensitive" } },
      ]
    }),

    ...(subDivisionId && {
      subDivisionId: subDivisionId
    }),

    ...(divisionId && {
      subDivision: {
        divisionId: divisionId
      }
    })
  };

  const [data, total] = await Promise.all([
    prisma.corporateSubDivisionAddress.findMany({
      where: whereCondition,
      select: {
        subDivisionAddressId: true,
        addressLine1: true,
        addressLine2: true,
        postalCode: true,
        isPrimary: true,
        createdAt: true,
        corporateId: true,
        divisionId: true,
        isActive: true,

        // City
        city: {
          select: {
            name: true
          }
        },

        // State
        state: {
          select: {
            name: true
          }
        },

        // Country
        country: {
          select: {
            name: true
          }
        },

        subDivision: {
          select: {
            subDivisionId: true,
            subDivisionName: true,
            division: {
              select: {
                divisionId: true,
                divisionName: true,
                corporate: {
                  select: {
                    corporateId: true,
                    corporateName: true
                  }
                }
              }
            }
          }
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc"
      }
    }),

    prisma.corporateSubDivisionAddress.count({
      where: whereCondition
    })
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
  getCorporateSubDivisionById,
  addSubDivision,
  deleteSubDivision,
  subDivisionAddress,
  subDivisionAddressList,
  getSubDivisionById
};
