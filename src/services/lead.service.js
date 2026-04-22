/**
 * Lead Service
 * Business logic for lead management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');
const { sendContractingTeamAssignedEmail, sendLeadAssignmentEmail } = require('./mail.service');
const { uploadToS3 } = require('../utils/s3Utils');
const { logLeadActivity } = require('../utils/activityLogger');
const { initTracker, completeTracker } = require('./reminder.service');
const path = require('path');

const getFullName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

const getLeadDisplayName = (lead) =>
  lead?.tripInfo?.tripName ||
  lead?.corporate?.corporateName ||
  lead?.lead_code ||
  lead?.leadId;

const getDocumentLinks = (leadDocuments = []) => {
  const seen = new Set();
  return (
    (leadDocuments || [])
      .map((doc) => {
        const documentName = String(doc?.master_document?.document_name || doc?.master_document?.document_code || '').trim();
        const fileName = String(doc?.file_name || '').trim();
        return {
          title: documentName || fileName,
          documentName,
          fileName,
          url: String(doc?.document_url || '').trim()
        };
      })
      .filter((doc) => doc.title || doc.fileName)
      .filter((doc) => {
        const key = `${doc.title}|${doc.fileName}|${doc.url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
  );
};

/**
 * Determines the Date Range for a specific dashboard period (Shared logic)
 */
const getDateRange = (type) => {
  let startDate, endDate;
  const now = new Date();
  const currentYear = now.getFullYear();

  switch (type) {
    case "mtd":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case "ytd":
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    case "q1": // Apr - Jun
      startDate = new Date(currentYear, 3, 1, 0, 0, 0, 0);
      endDate = new Date(currentYear, 5, 30, 23, 59, 59, 999);
      break;
    case "q2": // Jul - Sep
      startDate = new Date(currentYear, 6, 1, 0, 0, 0, 0);
      endDate = new Date(currentYear, 8, 30, 23, 59, 59, 999);
      break;
    case "q3": // Oct - Dec
      startDate = new Date(currentYear, 9, 1, 0, 0, 0, 0);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      break;
    case "q4": // Jan - Mar
      startDate = new Date(currentYear, 0, 1, 0, 0, 0, 0);
      endDate = new Date(currentYear, 2, 31, 23, 59, 59, 999);
      break;
    case "all":
    default:
      startDate = null;
      endDate = null;
  }
  return { startDate, endDate };
};

/**
 * Determines the Reference Travel Date for a lead based on priority:
 * 1. Destination (Option 1) Check-in
 * 2. Trip Info Check-in
 * 3. Fallback: createdAt
 */
const getReferenceDate = (lead) => {
  // 1. Final trip start date (Prioritized if lead is Won/Confirmed)
  if (lead.trip?.start_date) return new Date(lead.trip.start_date);

  // 2. Destination (Option 1) Check-in - Pick earliest if multiple legs exist
  const destDates = (lead.destinations || [])
    .filter(d => d.optionNo === 1 && d.checkInDate)
    .map(d => new Date(d.checkInDate).getTime());

  if (destDates.length > 0) {
    return new Date(Math.min(...destDates));
  }

  // 3. Trip Info Check-in (Lead Step 2)
  const tripDate = lead.tripInfo?.checkInDate;
  if (tripDate) return new Date(tripDate);

  // 4. Fallback (for sorting/lists only): createdAt
  return new Date(lead.createdAt);
};



const getTeamUserIds = async (userId) => {
  const result = [];
  const visited = new Set();

  const fetchTeam = async (ids) => {
    console.log("ids", ids);
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
  result.push(userId); // include self
  await fetchTeam([userId]);
  return result;
};


const isAdmin = async (userId, roleId = null) => {
  if (!roleId) return false;

  const roles = await prisma.userRole.findMany({
    where: {
      userId,
      roleId,
      role: {
        roleCode: {
          in: ['admin', 'superadmin', 'super_admin', 'owner'],
          mode: 'insensitive'
        }
      },
    },
    select: { roleId: true },
  });
  return roles.length > 0;
};
/**
 * Create a new lead
 */
const createLead = async (leadData, userId) => {
  // Validate corporate structure only if corporateId is provided (skipping for partial updates)
  if (leadData.corporateId) {
    const corporate = await prisma.corporate.findUnique({
      where: { corporateId: leadData.corporateId },
      include: {
        divisions: {
          where: { divisionId: leadData.divisionId },
          include: {
            subDivisions: {
              where: { subDivisionId: leadData.subDivisionId },
            },
          },
        },
      },
    });

    if (!corporate) {
      throw new NotFoundError('Corporate');
    }

    if (!corporate.divisions.length) {
      throw new ValidationError('Invalid division for the selected corporate');
    }

    if (!corporate.divisions[0].subDivisions.length) {
      throw new ValidationError('Invalid sub-division for the selected division');
    }
  }

  // Create or update lead with related data
  const lead = await prisma.$transaction(async (tx) => {
    let leadRecord;
    let assignmentEmailNeeded = false;
    let opsEmailNeeded = false;
    let teamEmailNeeded = false;
    let newTeamUserIds = [];

    const { leadId, tripInfo, destinations, pickupHubs, contractingTeamUserIds: rawTeamIds, modifiedBy, ...mainData } = leadData;
    const contractingTeamUserIds = Array.isArray(rawTeamIds) ? [...new Set(rawTeamIds)] : rawTeamIds;
    const headUserId = mainData.contractingHeadUserId;
    const opsHeadUserId = mainData.ops_head_user_id;

    if (leadId) {
      // Check if lead exists
      const existingLead = await tx.lead.findUnique({ where: { leadId } });
      if (!existingLead) throw new NotFoundError('Lead');

      // Check if contracting head has changed
      if (headUserId && headUserId !== existingLead.contractingHeadUserId) {
        assignmentEmailNeeded = true;
      }

      // Check if ops head has changed
      if (opsHeadUserId && opsHeadUserId !== existingLead.ops_head_user_id) {
        opsEmailNeeded = true;
      }

      // Check for new team members
      if (contractingTeamUserIds) {
        const existingTeam = await tx.leadContractingTeam.findMany({ where: { leadId } });
        const existingTeamIds = existingTeam.map((t) => t.userId);
        newTeamUserIds = contractingTeamUserIds.filter((id) => !existingTeamIds.includes(id));
        if (newTeamUserIds.length > 0) {
          teamEmailNeeded = true;
        }
      }

      // Update lead
      leadRecord = await tx.lead.update({
        where: { leadId },
        data: {
          ...mainData,
          modifiedBy: modifiedBy || userId,
          modifiedAt: new Date(),
        },
      });

      // Clear existing relations to replace with new data if provided
      if (tripInfo) await tx.leadTripInfo.deleteMany({ where: { leadId } });
      if (destinations?.length > 0) {
        await tx.leadDestination.deleteMany({ where: { leadId } });
        await tx.lead_service.deleteMany({ where: { lead_id: leadId } });
      }
      if (pickupHubs?.length > 0) await tx.leadPickupHub.deleteMany({ where: { leadId } });
      if (contractingTeamUserIds) await tx.leadContractingTeam.deleteMany({ where: { leadId } });
    } else {
      // Check labels for new lead
      if (headUserId) assignmentEmailNeeded = true;
      if (opsHeadUserId) opsEmailNeeded = true;
      if (contractingTeamUserIds?.length > 0) {
        teamEmailNeeded = true;
        newTeamUserIds = contractingTeamUserIds;
      }

      // Create lead
      leadRecord = await tx.lead.create({
        data: {
          ...mainData,
          createdBy: userId,
          stage: "LEAD",
        },
      });

      // 📝 Log activity
      // await logLeadActivity(leadRecord.leadId, userId, 'CREATE', 'Lead created');
    }

    const currentLeadId = leadRecord.leadId;

    // Create trip info if provided
    if (tripInfo) {
      await tx.leadTripInfo.create({
        data: {
          leadId: currentLeadId,
          ...tripInfo,
          createdBy: userId,
        },
      });
    }

    // Create destinations if provided
    if (destinations && destinations.length > 0) {
      for (const destination of destinations) {
        const { services, ...destData } = destination;
        await tx.leadDestination.create({
          data: {
            leadId: currentLeadId,
            ...destData,
            createdBy: userId,
          },
        });

        // Create services for destination (schema links them to lead_id)
        if (services && services.length > 0) {
          await tx.lead_service.createMany({
            data: services.map((service) => ({
              lead_id: currentLeadId,
              service_category_id: service.serviceCategoryId,
              service_type_id: service.serviceTypeId || null,
              notes: service.remarks || null,
              created_by: userId,
            })),
          });
        }
      }
    }

    // Create pickup hubs if provided
    if (pickupHubs && pickupHubs.length > 0) {
      await tx.leadPickupHub.createMany({
        data: pickupHubs.map((hub) => ({
          leadId: currentLeadId,
          hub_id: hub.hubId || hub.hub_id || hub.pickupHubId,
          travellerCount: hub.travellerCount,
          remarks: hub.remarks || null,
          createdBy: userId,
        })),
      });
    }

    // Create lead contracting team if provided (deduplicate to avoid @@id violations)
    if (contractingTeamUserIds && contractingTeamUserIds.length > 0) {
      const uniqueTeamIds = [...new Set(contractingTeamUserIds)];
      await tx.leadContractingTeam.createMany({
        data: uniqueTeamIds.map((tid) => ({
          leadId: currentLeadId,
          userId: tid,
          createdBy: userId,
        })),
      });
    }

    return {
      leadRecord,
      assignmentEmailNeeded, headUserId,
      opsEmailNeeded, opsHeadUserId,
      teamEmailNeeded, newTeamUserIds
    };
  });

  const {
    leadRecord,
    assignmentEmailNeeded, headUserId,
    opsEmailNeeded, opsHeadUserId,
    teamEmailNeeded, newTeamUserIds
  } = lead;

  // Trigger assignment emails (non-blocking)
  (async () => {
    try {
      const fullLeadData = await prisma.lead.findUnique({
        where: { leadId: leadRecord.leadId },
        include: {
          tripInfo: true,
          corporate: { select: { corporateName: true } },
          salesUser: { select: { email: true, firstName: true, lastName: true } },
          contractingHead: { select: { email: true, firstName: true, lastName: true } },
          lead_document: {
            where: { is_active: true },
            include: { master_document: true }
          }
        }
      });

      if (!fullLeadData) return;

      const leadDisplayName = getLeadDisplayName(fullLeadData);
      const documentTitles = getDocumentLinks(fullLeadData.lead_document);
      const emailOptions = {
        leadCode: fullLeadData.lead_code,
        documentTitles
      };

      const salesEmail = fullLeadData.salesUser?.email;

      // 1. Contracting Head
      if (assignmentEmailNeeded && headUserId) {
        const headUser = await prisma.appUser.findUnique({
          where: { userId: headUserId },
          select: { email: true, firstName: true, lastName: true }
        });
        if (headUser?.email) {
          const fullName = getFullName(headUser);
          await sendLeadAssignmentEmail(headUser.email, fullName, leadDisplayName, 'Dear', 'has been assigned to you as Contracting Head', salesEmail, fullLeadData.tripInfo, emailOptions);
        }
      }

      // 2. OPS Head
      if (opsEmailNeeded && opsHeadUserId) {
        const opsUser = await prisma.appUser.findUnique({
          where: { userId: opsHeadUserId },
          select: { email: true, firstName: true, lastName: true }
        });
        if (opsUser?.email) {
          const fullName = getFullName(opsUser);
          await sendLeadAssignmentEmail(opsUser.email, fullName, leadDisplayName, 'Dear', 'has been assigned to you for operations', null, fullLeadData.tripInfo, {
            leadCode: fullLeadData.lead_code
          });
        }
      }

      // 3. Contracting Team
      if (teamEmailNeeded && newTeamUserIds.length > 0) {
        const teamUsers = await prisma.appUser.findMany({
          where: { userId: { in: newTeamUserIds } },
          select: { email: true, firstName: true, lastName: true }
        });
        
        for (const user of teamUsers) {
          if (user.email) {
            const fullName = getFullName(user);
            await sendLeadAssignmentEmail(user.email, fullName, leadDisplayName, 'Dear', 'has added you to the contracting team for this lead', null, fullLeadData.tripInfo, emailOptions);
          }
        }

        const teamMemberNames = teamUsers.map(getFullName).filter(Boolean);

        if (salesEmail) {
          await sendContractingTeamAssignedEmail(
            salesEmail,
            getFullName(fullLeadData.salesUser) || 'SalesREP',
            leadDisplayName,
            teamMemberNames,
            fullLeadData.tripInfo,
            emailOptions
          );
        }

        const currentHead = fullLeadData.contractingHead;
        if (currentHead?.email) {
          await sendContractingTeamAssignedEmail(
            currentHead.email,
            getFullName(currentHead) || 'Contracting Head',
            leadDisplayName,
            teamMemberNames,
            fullLeadData.tripInfo,
            emailOptions
          );
        }
        
        // Complete the reminder tracker when a team is assigned
        await completeTracker(leadRecord.leadId);
      }

      // Initialize or update reminder tracker for Contracting Head
      if (assignmentEmailNeeded && headUserId) {
        const headUser = await prisma.appUser.findUnique({
          where: { userId: headUserId },
          select: { email: true, firstName: true, lastName: true }
        });
        
        if (headUser?.email) {
          const salesEmail = fullLeadData.salesUser?.email || null;
          await initTracker(
            leadRecord.leadId,
            fullLeadData.lead_code,
            headUserId,
            salesEmail,
            headUser.email
          );
        }
      }
    } catch (error) {
      console.error('Failed to trigger assignment notifications:', error.message);
    }
  })();

  return getLeadById(leadRecord.leadId);
};




// total leads count
const getTotalLeads = async (createdBy, email, roleId = null) => {
  let userId = createdBy;
  const admin = await isAdmin(userId, roleId);
  let where = {};

  if (!admin) {
    where.is_active = true;
    // get full team hierarchy
    const teamUserIds = await getTeamUserIds(userId);

    where.OR = [
      { salesUserId: { in: teamUserIds } },
      { contractingHeadUserId: { in: teamUserIds } },
      { createdBy: { in: teamUserIds } },
      { ops_head_user_id: { in: teamUserIds } },
      { contractingTeam: { some: { userId: { in: teamUserIds } } } },
    ];
  }
  const totalLeads = await prisma.lead.count({
    where,
  });

  return totalLeads;
};


// total count lead status


// const getTotalLeadStatus = async (salesUserId) => {
//   const totalLeadStatus = await prisma.lead.groupBy({
//     by: ['leadStatusId'],
//     where: {
//       salesUserId: salesUserId,
//     },
//     _count: {
//       leadStatusId: true,
//     },
//   });

//   return totalLeadStatus;

// };

const getTotalLeadStatus = async (createdBy, email, roleId = null) => {
  // 1️⃣ Group leads
  let userId = createdBy;
  const admin = await isAdmin(userId, roleId);
  let where = {};

  if (!admin) {
    where.is_active = true;
    // get full team hierarchy
    const teamUserIds = await getTeamUserIds(userId);

    where.OR = [
      { salesUserId: { in: teamUserIds } },
      { contractingHeadUserId: { in: teamUserIds } },
      { createdBy: { in: teamUserIds } },
      { ops_head_user_id: { in: teamUserIds } },
      { contractingTeam: { some: { userId: { in: teamUserIds } } } },
    ];
  }

  const grouped = await prisma.lead.groupBy({
    by: ['leadStatusId'],
    where,
    _count: {
      leadStatusId: true,
    },
  });

  const statusIds = grouped.map(g => g.leadStatusId);

  // 2️⃣ Get status details
  const statuses = await prisma.masterLeadStatus.findMany({
    where: {
      leadStatusId: { in: statusIds }
    }
  });

  // 3️⃣ Merge result
  const result = grouped.map(g => {
    const status = statuses.find(
      s => s.leadStatusId === g.leadStatusId
    );

    return {
      status_code: status?.statusCode,
      status_name: status?.statusName,
      total: g._count.leadStatusId
    };
  });

  return result;
};




/**
 * Get lead by ID
 */
const getLeadById = async (leadId) => {
  const commonInclude = {
    leadSegment: true,
    corporate: true,
    division: true,
    subDivision: true,
    contactPerson: true,
    salesUser: {
      include: {
        designation: true,
      },
    },
    creator: {
      select: {
        firstName: true,
        lastName: true,
      },
    },
    salesBranch: true,
    contractingHead: {
      include: {
        designation: true,
      },
    },
    leadStatus: true,
    tripInfo: true,
    lead_service: {
      include: {
        master_service_category: true,
        master_service_type: true,
      },
    },
    destinations: {
      include: {
        fromCountry: true,
        fromCity: true,
        toCountry: true,
        toCity: true,
      },
      orderBy: [{ optionNo: 'asc' }, { sequenceNo: 'asc' }],
    },
    contractingTeam: {
      include: {
        user: {
          include: {
            designation: true,
          },
        },
      },
    },
    lead_costsheet: {
      where: { is_active: true },
    },
    trip: true,
  };


  let lead;
  try {
    lead = await prisma.lead.findUnique({
      where: { leadId },
      include: {
        ...commonInclude,
        pickupHubs: {
          where: { is_active: true },
          include: {
            master_pickup_hub_: true,
          },
        },

        lead_costsheet: {
          where: { is_active: true },
        },
        lead_document: {
          where: { is_active: true },
          include: {
            master_document: true,
          },
        },
      },

    });
  } catch (error) {
    const message = String(error?.message || '');
    const isMissingPickupHubTable =
      message.includes('master_pickup_hub') && message.includes('does not exist');

    if (!isMissingPickupHubTable) {
      throw error;
    }

    // Fallback when pickup hub master table is unavailable in current DB.
    lead = await prisma.lead.findUnique({
      where: { leadId },
      include: {
        ...commonInclude,
        pickupHubs: true,
        lead_costsheet: {
          where: { is_active: true },
        },
        lead_document: {
          where: { is_active: true },
          include: {
            master_document: true,
          },
        },
      },

    });
  }

  if (!lead) {
    throw new NotFoundError('Lead');
  }

  // Handle BigInt serialization if file_size exists in documents
  if (lead.lead_document) {
    lead.lead_document = lead.lead_document.map(doc => ({
      ...doc,
      file_size: doc.file_size ? doc.file_size.toString() : null
    }));
  }

  return lead;
};

/**
 * Get leads with pagination and filters
 */
// const getLeads = async (createdBy, email, filters = {}, pagination = {}) => {
//   const page = pagination.page || PAGINATION.DEFAULT_PAGE;
//   const limit = Math.min(pagination.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
//   const skip = (page - 1) * limit;

//   // Build where clause
//   if (email == 'admin@alphadroid.io') {
//     var where = {};
//   } else {
//     var where = {
//       OR: [
//         { salesUserId: createdBy },
//         { contractingHeadUserId: createdBy },
//         { createdBy: createdBy },
//       ]
//     };
//   }

//   //const where = { createdBy: createdBy };
//   if (filters.leadSegmentId) where.leadSegmentId = filters.leadSegmentId;
//   if (filters.corporateId) where.corporateId = filters.corporateId;
//   if (filters.leadStatusId) where.leadStatusId = filters.leadStatusId;
//   if (filters.salesUserId) where.salesUserId = filters.salesUserId;

//   // Add search functionality
//   if (filters.search) {
//     where.OR = [
//       { corporate: { corporateName: { contains: filters.search, mode: 'insensitive' } } },
//       { contactMobile: { contains: filters.search } },
//       { contactEmail: { contains: filters.search, mode: 'insensitive' } },
//     ];
//   }

//   // Build orderBy
//   const orderBy = {};
//   const sortBy = filters.sortBy || 'createdAt';
//   const sortOrder = filters.sortOrder || 'desc';
//   orderBy[sortBy] = sortOrder;

//   // Execute query
//   const [leads, total] = await Promise.all([
//     prisma.lead.findMany({
//       where,
//       include: {
//         division: {
//           select: { divisionName: true }
//         },
//         subDivision: {
//           select: { subDivisionName: true }
//         },
//         contactPerson: {
//           select: {
//             firstName: true,
//             lastName: true,
//           }
//         },
//         salesBranch: {
//           select: { branchName: true }
//         },
//         tripInfo: {
//           select: {
//             tripType: true,
//             tripName: true,
//             totalBudget: true,
//             numberOfTravelers: true,
//             specificTravelDate: true,
//             createdAt: true,
//           }
//         },

//         leadSegment: {
//           select: { segmentName: true }
//         },

//         corporate: {
//           select: {
//             corporateName: true,
//             websiteUrl: true
//           }
//         },

//         leadStatus: {
//           select: {
//             statusName: true,
//             description: true,
//             statusCode: true
//           }
//         },
//         salesUser: {
//           select: {
//             userId: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//           },
//         },
//         _count: {
//           select: {
//             lead_costsheet: true,
//           }
//         },


//       },
//       orderBy,
//       skip,
//       take: limit,
//     }),
//     prisma.lead.count({ where }),
//   ]);

//   const totalPages = Math.ceil(total / limit) || 1;
//   return {
//     leads,
//     pagination: {
//       page,
//       limit,
//       total,
//       totalPages,
//     },
//   };
// };





const getLeads = async (userId, email, filters = {}, pagination = {}, roleId = null) => {
  const page = pagination.page || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(pagination.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const admin = await isAdmin(userId, roleId);
  let where = {};

  if (!admin) {
    where.is_active = true;
    // get full team hierarchy
    const teamUserIds = await getTeamUserIds(userId);

    where.OR = [
      { salesUserId: { in: teamUserIds } },
      { contractingHeadUserId: { in: teamUserIds } },
      { createdBy: { in: teamUserIds } },
      { ops_head_user_id: { in: teamUserIds } },
      { contractingTeam: { some: { userId: { in: teamUserIds } } } },
    ];
  }


  // Apply additional filters
  if (filters.leadSegmentId) where.leadSegmentId = filters.leadSegmentId;
  if (filters.corporateId) where.corporateId = filters.corporateId;
  if (filters.leadStatusId) where.leadStatusId = filters.leadStatusId;
  if (filters.salesUserId) where.salesUserId = filters.salesUserId;

  if (filters.search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { corporate: { corporateName: { contains: filters.search, mode: 'insensitive' } } },
          { contactMobile: { contains: filters.search } },
          { contactEmail: { contains: filters.search, mode: 'insensitive' } },
        ]
      }
    ];
  }

  const orderBy = {};
  const sortBy = filters.sortBy || 'createdAt';
  const sortOrder = filters.sortOrder || 'desc';
  orderBy[sortBy] = sortOrder;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        division: { select: { divisionName: true } },
        subDivision: { select: { subDivisionName: true } },
        contactPerson: { select: { firstName: true, lastName: true } },
        salesBranch: { select: { branchName: true } },
        tripInfo: { select: { tripType: true, tripName: true, totalBudget: true, numberOfTravelers: true, specificTravelDate: true, createdAt: true } },
        leadSegment: { select: { segmentName: true } },
        corporate: { select: { corporateName: true, websiteUrl: true } },
        leadStatus: { select: { statusName: true, description: true, statusCode: true } },
        salesUser: { select: { userId: true, firstName: true, lastName: true, email: true } },
        creator: { select: { firstName: true, lastName: true } },
        contractingHead: { select: { firstName: true, lastName: true } },
        trip: { select: { start_date: true } },
        destinations: {
          where: { optionNo: 1 },
          select: { checkInDate: true }
        },
        contractingTeam: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        },
        _count: { select: { lead_costsheet: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;
  return { leads, pagination: { page, limit, total, totalPages } };
};





/**
 * Update lead
 */
const updateLead = async (leadId, updateData, userId) => {
  // Check if lead exists

  const existingLead = await prisma.lead.findUnique({
    where: { leadId },
  });

  if (!existingLead) {
    throw new NotFoundError('Lead');
  }

  // Update lead
  const { contractingTeamUserIds: rawTeamIds, ...restUpdateData } = updateData;
  const contractingTeamUserIds = Array.isArray(rawTeamIds) ? [...new Set(rawTeamIds)] : rawTeamIds;

  const lead = await prisma.$transaction(async (tx) => {
    const updatedLead = await tx.lead.update({
      where: { leadId },
      data: {
        ...restUpdateData,
        modifiedBy: userId,
        modifiedAt: new Date(),
      },
      include: {
        leadSegment: true,
        corporate: true,
        division: true,
        subDivision: true,
        leadStatus: true,
        lead_costsheet: true,
      },
    });

    if (contractingTeamUserIds) {
      // Sync contracting team
      await tx.leadContractingTeam.deleteMany({ where: { leadId } });
      if (contractingTeamUserIds.length > 0) {
        await tx.leadContractingTeam.createMany({
          data: contractingTeamUserIds.map((tid) => ({
            leadId,
            userId: tid,
            createdBy: userId,
          })),
        });
      }
    }

    return updatedLead;
  });

  return lead;
};


/**
 * Update only Lead Status
 */
const updateLeadStatusData = async (leadId, updateData, userId) => {
  // Check if lead exists
  const existingLead = await prisma.lead.findUnique({
    where: { leadId },
  });

  if (!existingLead) {
    throw new NotFoundError('Lead');
  }

  // Update Lead Status
  const { leadId: lid, modifiedBy, ...restData } = updateData;

  const leadStatus = await prisma.lead.update({
    where: { leadId },
    data: {
      ...restData,
      modifiedBy: userId,
      modifiedAt: new Date(),
    }
  });

  return leadStatus;
};

/**
 * Update only Lead Status Requirement Note
 */
const updateLeadRequirementNote = async (leadId, updateData, userId) => {
  // Check if lead exists
  const existingLead = await prisma.lead.findUnique({
    where: { leadId },
  });

  if (!existingLead) {
    throw new NotFoundError('Lead');
  }

  // Update Lead Status
  const { leadId: lid, modifiedBy, ...restData } = updateData;

  const leadStatusREqNote = await prisma.lead.update({
    where: { leadId },
    data: {
      ...restData,
      modifiedBy: userId,
      modifiedAt: new Date(),
    }
  });

  return leadStatusREqNote;
};

/**
 * Delete lead (soft delete by updating status)
 */
const deleteLead = async (leadId) => {
  const lead = await prisma.lead.findUnique({
    where: { leadId },
  });

  if (!lead) {
    throw new NotFoundError('Lead');
  }

  // Soft delete by updating is_active to false
  await prisma.lead.update({
    where: { leadId },
    data: { is_active: false },
  });

  return { message: 'Lead deleted successfully' };
};

const createleadservice = async (data) => {
  const rows = (Array.isArray(data) ? data : []).map((item) => ({
    leadId: item.leadId || item.lead_id,
    hub_id: item.hub_id || item.hubId || item.pickupHubId,
    travellerCount: Number(item.travellerCount ?? item.traveller_count ?? 0),
    remarks: item.remarks ?? null,
    createdBy: item.createdBy || item.created_by,
    option_no: item.option_no || item.optionNo || item.optionNo,
  }));

  const invalidRow = rows.find((row) => !row.leadId || !row.hub_id || !row.createdBy);
  if (invalidRow) {
    throw new ValidationError('leadId, hub_id and createdBy are required for each pickup hub row');
  }

  const upsertedRows = await prisma.$transaction(
    rows.map((row) =>
      prisma.leadPickupHub.upsert({
        where: {
          leadId_hub_id: {
            leadId: row.leadId,
            hub_id: row.hub_id,
          },
        },
        update: {
          travellerCount: row.travellerCount,
          remarks: row.remarks,
          modifiedBy: row.createdBy,
          modifiedAt: new Date(),
          option_no: row.option_no,
        },
        create: row,
      })
    )
  );

  return {
    count: upsertedRows.length,
    rows: upsertedRows,
  };
};

/**
 * List master pickup hubs
 */
const listMasterPickupHubs = async (filters = {}) => {
  const where = {};

  if (filters.isActive !== undefined) {
    where.is_active = String(filters.isActive).toLowerCase() === 'true';
  } else {
    where.is_active = true;
  }

  if (filters.cityId) where.city_id = filters.cityId;
  if (filters.hubType) where.hub_type = filters.hubType;
  if (filters.airportCategory) where.airport_category = filters.airportCategory;

  if (filters.search) {
    where.OR = [
      { hub_name: { contains: filters.search, mode: 'insensitive' } },
      { hub_code_iata: { contains: filters.search, mode: 'insensitive' } },
      { hub_code_icao: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  try {
    const hubs = await prisma.master_pickup_hub.findMany({
      where,
      include: {
        master_city: {
          select: {
            cityId: true,
            name: true,
            state: {
              select: {
                stateId: true,
                name: true,
                country: {
                  select: {
                    countryId: true,
                    name: true,
                    isoCode: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ hub_name: 'asc' }],
    });
    console.log("hubs", hubs);
    return hubs;
  } catch (error) {
    const message = String(error?.message || '');
    const isMissingMappedTable =
      message.includes('master_pickup_hub') && message.includes('does not exist');

    if (!isMissingMappedTable) {
      throw error;
    }

    // Fallback for environments where pickup hub table name differs.
    const candidates = [
      { regclass: 'public.master_pickup_hub', tableExpr: '"master_pickup_hub"' },
      { regclass: 'public."master_pickup_hub "', tableExpr: '"master_pickup_hub "' },
      { regclass: 'public.master_pickup_hub_', tableExpr: '"master_pickup_hub_"' },
    ];

    let chosenTable = null;
    for (const candidate of candidates) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT to_regclass('${candidate.regclass}')::text AS name`
      );
      if (rows?.[0]?.name) {
        chosenTable = candidate.tableExpr;
        break;
      }
    }

    if (!chosenTable) {
      return [];
    }

    let query = `
      SELECT
        hub_id, city_id, hub_code_iata, hub_code_icao, hub_name, hub_type,
        airport_category, terminal_count, timezone, latitude, longitude,
        is_default, is_active, created_at, created_by, modified_at, modified_by
      FROM ${chosenTable}
      WHERE 1=1
    `;
    const params = [];

    if (where.is_active !== undefined) {
      params.push(where.is_active);
      query += ` AND is_active = $${params.length}`;
    }
    if (where.city_id) {
      params.push(where.city_id);
      query += ` AND city_id = $${params.length}::uuid`;
    }
    if (where.hub_type) {
      params.push(where.hub_type);
      query += ` AND hub_type = $${params.length}`;
    }
    if (where.airport_category) {
      params.push(where.airport_category);
      query += ` AND airport_category = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND (hub_name ILIKE $${params.length} OR hub_code_iata ILIKE $${params.length} OR hub_code_icao ILIKE $${params.length})`;
    }
    query += ' ORDER BY hub_name ASC';

    const rawHubs = await prisma.$queryRawUnsafe(query, ...params);
    const cityIds = [...new Set(rawHubs.map((hub) => hub.city_id).filter(Boolean))];

    let cityMap = new Map();
    if (cityIds.length) {
      const cities = await prisma.masterCity.findMany({
        where: { cityId: { in: cityIds } },
        select: {
          cityId: true,
          name: true,
          state: {
            select: {
              stateId: true,
              name: true,
              country: {
                select: {
                  countryId: true,
                  name: true,
                  isoCode: true,
                },
              },
            },
          },
        },
      });
      cityMap = new Map(cities.map((city) => [city.cityId, city]));
    }

    return rawHubs.map((hub) => ({
      ...hub,
      master_city: cityMap.get(hub.city_id) || null,
    }));
  }
};

/**
 * Confirm Lead (WIN/LOST) and process checklist documents & file uploads
 */
const confirmLead = async (data, files, userId) => {
  const {
    leadId,
    stage,
    opsUserId,
    confirmationDate,
    opsNotes,
    documentIds,
    byName
  } = data;

  if (!leadId || !stage) {
    throw new ValidationError('leadId and stage are required');
  }

  const existingLead = await prisma.lead.findUnique({ where: { leadId } });
  if (!existingLead) throw new NotFoundError('Lead');

  const updateData = {
    stage,
    is_confirmed: true,
    modifiedBy: userId,
    modifiedAt: new Date(),
  };

  if (stage === 'WIN') {
    updateData.ops_head_user_id = opsUserId || null;
    updateData.confirmation_date = confirmationDate ? new Date(confirmationDate) : new Date();
    updateData.ops_remarks = opsNotes || null;
  } else if (stage === 'LOST') {
    updateData.ops_remarks = opsNotes || null;
    updateData.confirmation_date = confirmationDate ? new Date(confirmationDate) : new Date();
  }

  return await prisma.$transaction(async (tx) => {

    // 1. Update Lead
    await tx.lead.update({
      where: { leadId },
      data: updateData
    });

    // 📝 Log activity
    // await logLeadActivity(leadId, userId, 'CONFIRMATION_CHANGE', `Lead stage changed to: ${stage}`);

    // 2. Parse documentIds
    let docsArray = [];
    try {
      if (typeof documentIds === 'string') {
        docsArray = JSON.parse(documentIds);
      } else if (Array.isArray(documentIds)) {
        docsArray = documentIds;
      }
    } catch {
      throw new ValidationError('Invalid documentIds format');
    }

    if (!Array.isArray(docsArray)) {
      docsArray = [docsArray];
    }

    // 3. Process documents
    for (let i = 0; i < docsArray.length; i++) {
      const rawDocId = docsArray[i];
      if (!rawDocId) continue;

      let actualDocId = rawDocId;
      let normalizedDocName = '';

      // ✅ byName logic with fallback
      if (byName == "true" || byName === true) {
        normalizedDocName = String(rawDocId).trim();

        const mDoc = await tx.master_document.findFirst({
          where: {
            document_name: {
              equals: normalizedDocName,
              mode: 'insensitive'
            }
          }
        });

        if (mDoc) {
          actualDocId = mDoc.document_id;
        } else {
          // Special "Other/Fallback" document UUID from master_document
          actualDocId = '7106d3f1-f046-4c87-a6c7-8d077cda35f5';
          console.warn(`Fallback: storing "${normalizedDocName}" as Generic document ID`);
        }
      }

      let file = null;
      if (files && Array.isArray(files)) {
        // Multer with .any() puts files in an array with 'fieldname'
        const targetField = `file_${rawDocId}`;
        const sanitizedTargetField = `file_${String(rawDocId).replace(/[^a-zA-Z0-9]/g, '_')}`;

        file = files.find(f =>
          f.fieldname === targetField ||
          f.fieldname === sanitizedTargetField ||
          f.originalname === rawDocId
        );
      } else if (files && typeof files === 'object') {
        // Fallback for express-fileupload or other object-based maps
        file = files[`file_${rawDocId}`];
      }

      let fileUrl = null;
      let fileName = null;
      let mimeType = null;
      let fileSize = null;

      if (file) {
        // 🚀 UPLOAD TO S3
        const folder = 'Lead';
        const s3FileName = `${folder}/${leadId}/document_${leadId}_${Date.now()}_${i}${path.extname(file.name)}`;
        const uploadResult = await uploadToS3(file, s3FileName);

        fileUrl = uploadResult.url;
        fileName = file.name || null;
        mimeType = file.mimetype || null;
        fileSize = file.size || null;
      }

      // 5. Create doc (allowing duplicates now)
      await tx.lead_document.create({
        data: {
          lead_id: leadId,
          document_id: actualDocId,
          document_url: fileUrl || '',
          file_name: fileName,
          mime_type: (byName === "true" || byName === true) ? normalizedDocName : mimeType,
          file_size: fileSize ? BigInt(fileSize) : null,
          created_by: userId,
          is_active: true
        }
      });
    }

    // 6. Return final data
    const finalLead = await tx.lead.findUnique({
      where: { leadId },
      include: {
        lead_document: {
          include: {
            master_document: true
          }
        }
      }
    });

    if (finalLead?.lead_document) {
      finalLead.lead_document = finalLead.lead_document.map(doc => ({
        ...doc,
        file_size: doc.file_size ? doc.file_size.toString() : null
      }));
    }

    return finalLead;
  });
};

//get all lead data againest leaid id
const getAllLeadData = async (leadId) => {
  const lead = await prisma.lead.findUnique({
    where: { leadId },
    include: {
      tripInfo: true,
      contractingTeam: true,
      lead_costsheet: true,
      destinations: true,
      pickupHubs: true,
      proposals: true,
      lead_service: true,
    },
  });
  return lead;
};

const getDestinationReport = async (data) => {
  const { leadId, optionNo } = data;
  const optNo = parseInt(optionNo);

  const lead = await prisma.lead.findUnique({
    where: { leadId },
    include: {
      corporate: {
        select: { corporateName: true }
      },
      tripInfo: {
        select: {
          tripName: true,
          numberOfTravelers: true
        }
      },
      salesUser: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      pickupHubs: {
        where: {
          is_active: true,
          OR: [
            { option_no: optNo },
            { option_no: null }
          ]
        },
        include: {
          master_pickup_hub_: true
        }
      },

      lead_costsheet: {
        where: { optionNo: optNo },
        include: {
          costsheet_template: true
        }
      },
      destinations: {
        where: { optionNo: optNo },
        orderBy: { sequenceNo: 'asc' },
        include: {
          toCity: true,
          toCountry: true,
        }
      },
      lead_service: {
        where: { is_active: true },
        include: {
          master_service_category: true,
          master_service_type: true
        }
      }
    }
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Format the response - Flattened root structure with numbered destination keys
  const firstCostSheet = lead.lead_costsheet[0] || {};
  const response = {
    // Single Data at Root
    corporateName: lead.corporate?.corporateName || null,
    tripName: lead.tripInfo?.tripName || null,
    paxCount: lead.tripInfo?.numberOfTravelers || 0,
    salesPersonName: lead.salesUser ? `${lead.salesUser.firstName} ${lead.salesUser.lastName}`.trim() : null,

    // Costing Details at Root
    totalCost: firstCostSheet.totalCost || null,
    sellingPrice: firstCostSheet.sellingPrice || null,
    totalGOP: firstCostSheet.totalGop || null,
    costSheetTemplateName: firstCostSheet.costsheet_template?.templateName || null,
  };

  // Dynamically add numbered destination keys to root
  lead.destinations.forEach((dest, index) => {
    const i = index + 1;
    const checkInRaw = dest.checkInDate ? new Date(dest.checkInDate) : null;
    const checkOutRaw = dest.checkOutDate ? new Date(dest.checkOutDate) : null;

    const formatDate = (d) => {
      if (!d || isNaN(d.getTime())) return 'N/A';
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const calculateDuration = (start, end) => {
      if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return 'N/A';
      const nights = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
      const days = nights + 1;
      return `${String(nights).padStart(2, '0')} Nights / ${String(days).padStart(2, '0')} Days`;
    };

    response[`${i}_destination_city`] = dest.toCity?.name || null;
    response[`${i}_destination_country`] = dest.toCountry?.name || null;
    response[`${i}_checkin`] = formatDate(checkInRaw);
    response[`${i}_checkout`] = formatDate(checkOutRaw);
    response[`${i}_duration`] = calculateDuration(checkInRaw, checkOutRaw);
    response[`${i}_city_image`] = dest.toCity?.city_image || null;
    response[`${i}_city_description`] = dest.toCity?.city_description || null;
  });

  // Re-append other root data - Refactored for easy display
  const sheetData = firstCostSheet.sheetData || {};
  response.totalCost = firstCostSheet.totalCost || null;
  response.sellingPrice = firstCostSheet.sellingPrice || null;
  response.totalGOP = firstCostSheet.totalGop || null;
  response.costSheetTemplateName = firstCostSheet.costsheet_template?.templateName || null;

  // Flattened cost sheet structures
  response.costSheetRows = sheetData.rows || [];
  response.costSheetColumns = sheetData.columns || [];

  response.pickupHubs = lead.pickupHubs.map(hub => ({
    hub_name: hub.master_pickup_hub_?.hub_name || null,
    traveller_count: hub.travellerCount,
    remarks: hub.remarks
  }));

  response.leadServices = lead.lead_service.map(svc => ({
    category: svc.master_service_category?.categoryName || null,
    type: svc.master_service_type?.serviceTypeName || null,
    notes: svc.notes || null,
  }));

  return response;
};

/**
 * Get leads where a user is involved in any of the 5 key roles:
 * salesUser, contractingHeadUserId, ops_head_user_id, createdBy, modifiedBy
 */
const getLeadsByInvolvement = async (userId, pagination = {}) => {
  const page = pagination.page || 1;
  const limit = Math.min(pagination.limit || 50, 100);
  const skip = (page - 1) * limit;

  const admin = await isAdmin(userId);
  const where = {
    ...(admin ? {} : { is_active: true }),
    OR: [
      { salesUserId: userId },
      { contractingHeadUserId: userId },
      { createdBy: userId },
      { modifiedBy: userId },
      { ops_head_user_id: userId },
    ],
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        division: { select: { divisionName: true } },
        subDivision: { select: { subDivisionName: true } },
        contactPerson: { select: { firstName: true, lastName: true } },
        salesBranch: { select: { branchName: true } },
        tripInfo: { select: { tripType: true, tripName: true, totalBudget: true, numberOfTravelers: true, specificTravelDate: true, createdAt: true } },
        leadSegment: { select: { segmentName: true } },
        corporate: { select: { corporateName: true, websiteUrl: true } },
        leadStatus: { select: { statusName: true, description: true, statusCode: true } },
        salesUser: { select: { userId: true, firstName: true, lastName: true, email: true } },
        creator: { select: { firstName: true, lastName: true } },
        modifier: { select: { firstName: true, lastName: true } },
        contractingHead: { select: { firstName: true, lastName: true } },
        opsHead: { select: { firstName: true, lastName: true } },
        destinations: {
          where: { optionNo: 1 },
          take: 1,
          select: { checkInDate: true }
        },
        _count: { select: { lead_costsheet: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

module.exports = {
  createLead,
  getLeadById,
  getLeads,
  updateLead,
  deleteLead,
  updateLeadStatusData,
  updateLeadRequirementNote,
  getTotalLeads,
  getTotalLeadStatus,
  getLeadsByInvolvement,
  createleadservice,
  listMasterPickupHubs,
  confirmLead,
  getAllLeadData,
  getDestinationReport,
  getLeadHistory: async (leadId) => {
    return prisma.leadActivityLog.findMany({
      where: { leadId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            designation: { select: { designationName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Toggle lead_document is_active status
   * Smarter lookup: tries lead_document_id first, then falls back to document_id scoped by leadId
   */
  toggleLeadDocumentStatus: async (leadDocumentId, leadId, userId) => {
    // 🔍 1. Try to find by primary key first
    let doc = await prisma.lead_document.findUnique({
      where: { lead_document_id: leadDocumentId }
    });

    // 🔍 2. If not found, it might be a master document_id scoped to this lead
    if (!doc && leadId) {
      doc = await prisma.lead_document.findFirst({
        where: {
          document_id: leadDocumentId,
          lead_id: leadId
        },
        orderBy: { created_at: 'desc' }
      });
    }

    if (!doc) throw new Error('Document not found');

    const updated = await prisma.lead_document.update({
      where: { lead_document_id: doc.lead_document_id },
      data: {
        is_active: !doc.is_active,
        modified_by: userId,
        modified_at: new Date()
      }
    });

    // 📝 Log activity
    // await logLeadActivity(
    //   doc.lead_id,
    //   userId,
    //   'DOCUMENT_STATUS',
    //   `Document "${doc.file_name || 'Generic'}" ${updated.is_active ? 'activated' : 'deactivated'}`
    // );

    return updated;
  },

  /**
   * Deactivate lead_pickup_hub
   */
  deactivateLeadPickupHub: async (leadHubId, userId) => {
    return prisma.leadPickupHub.update({
      where: { lead_hub_id: leadHubId },
      data: {
        is_active: false,
        modifiedAt: new Date(),
        modifiedBy: userId
      }
    });
  }
};

