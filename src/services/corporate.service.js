/**
 * lead Status Service
 * Business logic for lead Status management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


/**
 * Get lead Status list
 */
const getCorporate = async () => {
  const Corporate = await prisma.corporate.findMany({
    where: { isActive: true },
    select: {
      corporateId: true, corporateCode: true, corporateName: true, websiteUrl: true, createdAt: true, divisions: true,

    },
  });
  if (!Corporate) {
    throw new NotFoundError('Corporate');
  }
  return Corporate;
};

/**
 * Get lead Status list
 */



const addCorporate = async (data, userId, file) => {
  // update
  console.log("data", data);
  let result = "";
  if (data.corporateId !== undefined && data.corporateId !== null && data.corporateId !== "") {
    result = await prisma.corporate.update({
      where: {
        corporateId: data.corporateId
      },
      data: {
        corporateCode: data.corporateCode,
        corporateName: data.corporateName,
        websiteUrl: data.websiteUrl,
        isActive: data.isActive,
        gstin: data.gstin,
        pan: data.pan,
        companySize: data.companySize,
        companyVertical: data.companyVertical,
        companyDescription: data.companyDescription,
        facebookUrl: data.facebookUrl,
        linkedinUrl: data.linkedinUrl,
        twitterUrl: data.twitterUrl,
      }
    });
  } else {
    // insert
    result = await prisma.corporate.create({
      data: {
        corporateCode: data.corporateCode,
        corporateName: data.corporateName,
        websiteUrl: data.websiteUrl,
        isActive: data.isActive ?? true,
        gstin: data.gstin,
        pan: data.pan,
        companySize: data.companySize,
        companyVertical: data.companyVertical,
        companyDescription: data.companyDescription,
        facebookUrl: data.facebookUrl,
        linkedinUrl: data.linkedinUrl,
        twitterUrl: data.twitterUrl,
      }
    });

    // Automatically create default division and sub-division
    const mainDivision = await prisma.corporateDivision.create({
      data: {
        corporateId: result.corporateId,
        divisionName: 'Main Division',
        isActive: true
      }
    });

    const subDivision = await prisma.corporateSubDivision.create({
      data: {
        divisionId: mainDivision.divisionId,
        subDivisionName: 'Main Sub Division',
        isActive: true
      }
    });

    result.mainDivision = mainDivision;
    result.mainSubDivision = subDivision;
  }

  // Step 2: Rename file using leadId
  if (result.corporateId) {
    if (file) {
      const ext = path.extname(file.originalname);
      const newFileName = `Corporate_${result.corporateId}${ext}`;
      const newPath = path.join('uploads/logo', newFileName);
      fs.renameSync(file.path, newPath);
      // Step 3: Update DB with new file path
      await prisma.corporate.update({
        where: { corporateId: result.corporateId },
        data: {
          logo: newPath
        }
      });
    }
  }

  if (!result) {
    throw new NotFoundError('Corporate');
  }
  return result;
};


const getCorporatesList = async ({ page = 1, limit = 10, search, isActive }) => {
  const skip = (page - 1) * limit;

  const where = {
    AND: [
      search
        ? {
          OR: [
            {
              corporateName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              corporateCode: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
        : {},

      isActive !== undefined
        ? {
          isActive: isActive,
        }
        : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.corporate.findMany({
      where,
      skip,
      take: limit,
      include: {
        divisions: {
          include: {
            subDivisions: {
              include: {
                addresses: {
                  where: { isPrimary: true },
                  include: {
                    city: {
                      select: { name: true }
                    }
                  }
                }
              }
            }
          }
        },
        contactPersons: {
          orderBy: { isPrimary: 'desc' },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
            location: true,
            isPrimary: true
          }
        },
        _count: {
          select: {
            leads: true
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    }).then(list => {
      // Flatten the data for the frontend
      return list.map(corp => {
        let city = null;
        // Try to find the primary city from the nested structure
        for (const div of corp.divisions || []) {
          for (const sub of div.subDivisions || []) {
            if (sub.addresses && sub.addresses.length > 0) {
              city = sub.addresses[0].city?.name || sub.addresses[0].cityName;
              if (city) break;
            }
          }
          if (city) break;
        }

        const primaryContact = corp.contactPersons?.find(cp => cp.isPrimary) || corp.contactPersons?.[0];
        
        return {
          ...corp,
          city: city || primaryContact?.location || null,
          primaryContact: primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName || ""}`.trim() : null,
          mobile: primaryContact?.mobile || null,
          email: primaryContact?.email || null,
          tripCount: corp._count?.leads || 0
        };
      });
    }),

    prisma.corporate.count({ where }),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};


const updateCorporateStatus = async (data) => {

  const result = await prisma.corporate.updateMany({
    where: {
      corporateId: {
        in: data.corporateIds
      }
    },
    data: {
      isActive: data.isActive
    }
  });

  return result;
};


const addContactPerson = async (data) => {
  // Check for uniqueness if inserting or changing mobile/email
  const mobileCheck = data.mobile?.trim();
  const emailCheck = data.email?.trim()?.toLowerCase();

  // 1. Uniqueness check for Mobile
  if (mobileCheck) {
    const existingMobile = await prisma.corporateContactPerson.findFirst({
      where: {
        mobile: mobileCheck,
        isActive: true,
        ...(data.contactPersonId && { contactPersonId: { not: data.contactPersonId } })
      }
    });
    if (existingMobile) {
      throw new ValidationError(`Mobile number ${mobileCheck} already exists. Please enter a unique mobile number.`);
    }
  }

  // 2. Uniqueness check for Email
  if (emailCheck) {
    const existingEmail = await prisma.corporateContactPerson.findFirst({
      where: {
        email: { equals: emailCheck, mode: 'insensitive' },
        isActive: true,
        ...(data.contactPersonId && { contactPersonId: { not: data.contactPersonId } })
      }
    });
    if (existingEmail) {
      throw new ValidationError(`Email ${emailCheck} already exists. Please enter a unique email address.`);
    }
  }

  if (data.contactPersonId) {
    // update
    const contactPerson = await prisma.corporateContactPerson.update({
      where: {
        contactPersonId: data.contactPersonId
      },
      data: {
        corporateId: data.corporateId,
        divisionId: data.divisionId,
        subDivisionId: data.subDivisionId,
        firstName: data.firstName,
        lastName: data.lastName,
        designation: data.designation,
        email: data.email,
        mobile: data.mobile,
        alternateMobile: data.alternateMobile,
        location: data.location,
        isPrimary: data.isPrimary,
        isActive: data.isActive ?? true,
        gender: data.gender,
        dob: data.dob ? new Date(data.dob) : null,
      }
    });
    if (!contactPerson) {
      throw new NotFoundError('contactPerson');
    }
    return contactPerson;
  } else {
    // insert
    const contactPerson = await prisma.corporateContactPerson.create({
      data: {
        corporateId: data.corporateId,
        divisionId: data.divisionId,
        subDivisionId: data.subDivisionId,
        firstName: data.firstName,
        lastName: data.lastName,
        designation: data.designation,
        email: data.email,
        mobile: data.mobile,
        alternateMobile: data.alternateMobile,
        location: data.location,
        isPrimary: data.isPrimary,
        isActive: data.isActive ?? true,
        gender: data.gender,
        dob: data.dob ? new Date(data.dob) : null,
      }
    });
    if (!contactPerson) {
      throw new NotFoundError('contactPerson');
    }
    return contactPerson;
  }
};


const deleteContactPerson = async (data) => {
  const result = await prisma.corporateContactPerson.updateMany({
    where: {
      contactPersonId: {
        in: data.contactPersonIds
      }
    },
    data: {
      isActive: data.isActive
    }
  });
  return result;
};



// const getContactPersonList = async ({ divisionId, subDivisionId, page = 1, limit = 10, search = "" }) => {

//   const skip = (page - 1) * limit;

//   const whereCondition = {
//     isActive: true,
//     OR: [
//       { firstName: { contains: search, mode: "insensitive" } },
//       { lastName: { contains: search, mode: "insensitive" } },
//       { designation: { contains: search, mode: "insensitive" } },
//       { email: { contains: search, mode: "insensitive" } },

//       {
//         division: {
//           divisionName: {
//             contains: search,
//             mode: "insensitive"
//           }
//         }
//       },

//       {
//         subDivision: {
//           subDivisionName: {
//             contains: search,
//             mode: "insensitive"
//           }
//         }
//       }
//     ]
//   };

//   const [data, total] = await Promise.all([
//     prisma.corporateContactPerson.findMany({
//       where: whereCondition,
//       select: {
//         contactPersonId: true,
//         firstName: true,
//         lastName: true,
//         designation: true,
//         email: true,
//         mobile: true,
//         alternateMobile: true,
//         location: true,
//         isPrimary: true,

//         division: {
//           select: {
//             divisionName: true
//           }
//         },

//         subDivision: {
//           select: {
//             subDivisionName: true
//           }
//         }
//       },
//       skip,
//       take: limit,
//       orderBy: {
//         createdAt: "desc"
//       }
//     }),

//     prisma.corporateContactPerson.count({
//       where: whereCondition
//     })
//   ]);

//   return {
//     data,
//     pagination: {
//       total,
//       page,
//       limit,
//       totalPages: Math.ceil(total / limit)
//     }
//   };
// };




const getContactPersonList = async ({
  divisionId,
  subDivisionId,
  page = 1,
  limit = 10,
  search = ""
}) => {

  const skip = (page - 1) * limit;

  const whereCondition = {
    isActive: true,

    ...(divisionId && { divisionId: divisionId }),

    ...(subDivisionId && { subDivisionId: subDivisionId }),

    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },

        {
          division: {
            divisionName: {
              contains: search,
              mode: "insensitive"
            }
          }
        },

        {
          subDivision: {
            subDivisionName: {
              contains: search,
              mode: "insensitive"
            }
          }
        }
      ]
    })
  };

  const [data, total] = await Promise.all([
    prisma.corporateContactPerson.findMany({
      where: whereCondition,
      select: {
        contactPersonId: true,
        corporateId: true,
        divisionId: true,
        subDivisionId: true,
        firstName: true,
        lastName: true,
        designation: true,
        email: true,
        mobile: true,
        alternateMobile: true,
        location: true,
        isPrimary: true,
        gender: true,
        dob: true,
        isActive: true,
        corporate: {
          select: {
            corporateId: true,
            corporateName: true
          }
        },

        division: {
          select: {
            divisionName: true
          }
        },

        subDivision: {
          select: {
            subDivisionName: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc"
      }
    }),

    prisma.corporateContactPerson.count({
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
  getCorporate,
  addCorporate,
  getCorporatesList,
  updateCorporateStatus,
  addContactPerson,
  deleteContactPerson,
  getContactPersonList,
};
