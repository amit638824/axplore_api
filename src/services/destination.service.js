/**
 * Destination Service
 * //Business logic for Destination management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');

const resolveLeadId = async (item) => {
  if (item.leadId || item.lead_id) {
    return item.leadId || item.lead_id;
  }

  // Backward compatibility: older payloads send leadDestinationId
  if (item.leadDestinationId) {
    const destination = await prisma.leadDestination.findUnique({
      where: { leadDestinationId: item.leadDestinationId },
      select: { leadId: true },
    });
    return destination?.leadId || null;
  }

  return null;
};

// const createSeprateDestination = async (data) => {
//         const destinations = data;
//         const result = await Promise.all(
//          destinations.map(item =>
//            prisma.leadDestination.create({ data: item })
//          )
//          );
//         return result;
// };

// const updateSeprateDestination = async (destinations) => {
// const result = await Promise.all(
//   destinations.map(item =>
//     prisma.leadDestination.update({
//       where: {
//         leadDestinationId: item.leadDestinationId, // MUST be unique
//       },
//       data: {
//         optionNo: item.optionNo,
//         sequenceNo: item.sequenceNo,
//         fromCountryId: item.fromCountryId,
//         fromCityId: item.fromCityId,
//         toCountryId: item.toCountryId,
//         toCityId: item.toCityId,
//         numberOfTravelers: item.numberOfTravelers,
//         travelDate: item.travelDate,
//         idExtendedTrip:item.idExtendedTrip,  
//         modifiedAt: new Date(),     
//         modifiedBy: item.modifiedBy,
//       }
//     })
//   )
// );
// return result;
// };


const createDestination = async (data) => {
  const result = await Promise.all(
    data.map(async item => {
      if (item.leadDestinationId) {
        return prisma.leadDestination.update({
          where: {
            leadDestinationId: item.leadDestinationId,
          },
          data: {
            optionNo: item.optionNo ? Number(item.optionNo) : undefined,
            sequenceNo: item.sequenceNo ? Number(item.sequenceNo) : undefined,
            fromCountryId: item.fromCountryId,
            fromCityId: item.fromCityId,
            toCountryId: item.toCountryId,
            toCityId: item.toCityId,
            numberOfTravelers: item.numberOfTravelers ? Number(item.numberOfTravelers) : undefined,
            checkInDate: item.checkInDate ? new Date(item.checkInDate) : undefined,
            checkOutDate: item.checkOutDate ? new Date(item.checkOutDate) : undefined,
            isExtendedTrip: item.isExtendedTrip === true || item.idExtendedTrip === "true" || item.idExtendedTrip === true,
            modifiedAt: new Date(),
            modifiedBy: item.modifiedBy,
          }
        });
      } else {
        if (item.leadId) {
          await prisma.lead.update({
            where: { leadId: item.leadId },
            data: { stage: 'COSTING' }
          });
        }
        return prisma.leadDestination.create({
          data: {
            optionNo: Number(item.optionNo),
            sequenceNo: Number(item.sequenceNo),
            numberOfTravelers: Number(item.numberOfTravelers),
            checkInDate: item.checkInDate ? new Date(item.checkInDate) : null,
            checkOutDate: item.checkOutDate ? new Date(item.checkOutDate) : null,
            isExtendedTrip: item.isExtendedTrip === true || item.idExtendedTrip === "true" || item.idExtendedTrip === true,
            createdAt: new Date(),
            lead: {
              connect: { leadId: item.leadId }
            },
            fromCountry: {
              connect: { countryId: item.fromCountryId }
            },
            fromCity: {
              connect: { cityId: item.fromCityId }
            },
            toCountry: {
              connect: { countryId: item.toCountryId }
            },
            toCity: {
              connect: { cityId: item.toCityId }
            },
            creator: {
              connect: { userId: item.createdBy || item.modifiedBy }
            }
          }
        });
      }
    })
  );


  return result;
};




/**
 * Get Label list
 */

const getLevelListData = async () => {
  const LevelLis = await prisma.masterServiceLevel.findMany({
    where: { isActive: true },
    select: {
      serviceLevelId: true, levelName: true, displayOrder: true,
    },
  });
  if (!LevelLis) {
    throw new NotFoundError('LevelLis');
  }
  return LevelLis;
};


/**
 * Get Service list
 */

// old code
// const getServiceListData = async () => {
//   const ServiceList = await prisma.masterServiceCategory.findMany({
//    where: {
//     isActive: true
//   },
//   select: {
//     serviceCategoryId: true,
//     categoryName: true,
//     serviceTypes: {
//       where: {
//         isActive: true
//       },
//       select: {
//         serviceTypeId: true,
//         serviceTypeName: true
//       },
//       orderBy: {
//         displayOrder: 'asc'
//       }
//     }
//   },  
//   });
//   if (!ServiceList) {
//     throw new NotFoundError('ServiceList');
//   }
//   return ServiceList;
// };


const getServiceListData = async () => {
  const result = await prisma.masterServiceCategory.findMany({
    where: {
      isActive: true
    },
    include: {
      serviceTypes: {
        where: {
          isActive: true
        }
      }
    },
    orderBy: {
      displayOrder: 'asc'
    }
  });

  const categories = result.map(c => ({
    serviceCategoryId: c.serviceCategoryId,
    categoryCode: c.categoryCode,
    categoryName: c.categoryName
  }));

  const serviceTypes = result.flatMap(c =>
    c.serviceTypes.map(t => ({
      serviceTypeId: t.serviceTypeId,
      serviceCategoryId: c.serviceCategoryId,
      serviceTypeCode: t.serviceTypeCode,
      serviceTypeName: t.serviceTypeName
    }))
  );

  return {
    categories,
    serviceTypes
  };
  if (!result) {
    throw new NotFoundError('result');
  }
  return result;
};





/**
 * Add  Services
 */


const createServiceData = async (serviceData) => {
  try {
    const result = await Promise.all(
      serviceData.map(async (item) => {
        const leadId = await resolveLeadId(item);
        const serviceCategoryId = item.serviceCategoryId || item.service_category_id;
        const serviceTypeId = item.serviceTypeId || item.service_type_id;
        const notes = item.notes ?? item.remarks ?? null;
        const createdBy = item.createdBy || item.created_by;
        const modifiedBy = item.modifiedBy || item.modified_by;
        const leadServiceId = item.leadServiceId || item.lead_service_id;

        if (!leadId || !serviceCategoryId) {
          throw new ValidationError('leadId and serviceCategoryId are required');
        }

        if (leadServiceId) {
          return prisma.lead_service.update({
            where: { lead_service_id: leadServiceId },
            data: {
              lead_id: leadId,
              service_category_id: serviceCategoryId,
              service_type_id: serviceTypeId || null,
              notes,
              modified_at: new Date(),
              modified_by: modifiedBy || createdBy || null,
            },
          });
        }

        if (!createdBy) {
          throw new ValidationError('createdBy is required while creating service');
        }

        return prisma.lead_service.create({
          data: {
            lead_id: leadId,
            service_category_id: serviceCategoryId,
            service_type_id: serviceTypeId || null,
            notes,
            created_by: createdBy,
          },
        });
      })
    );

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// const createServiceData = async (data) => {
//   try {
//     const result = await prisma.LeadService.createMany({
//       data: data.map((item) => ({
//         leadDestinationId: item.leadDestinationId,
//         serviceCategoryId: item.serviceCategoryId,
//         serviceTypeId: item.serviceTypeId,
//         serviceLevelId: item.serviceLevelId,
//         remarks: item.remarks || null,
//         createdBy: item.createdBy,
//         quantity: item.quantity,
//         displayOrder: item.displayOrder || null,     
//       })),
//     });
//     return result;
//   } catch (error) {
//     console.error(error);
//     throw error;
//   }
// };

const updateServiceData = async (serviceData) => {
  try {
    const result = await Promise.all(
      serviceData.map((item) => {
        const leadServiceId = item.leadServiceId || item.lead_service_id;

        if (!leadServiceId) {
          throw new ValidationError('leadServiceId is required for update');
        }

        return prisma.lead_service.update({
          where: {
            lead_service_id: leadServiceId,
          },
          data: {
            ...(item.leadId && { lead_id: item.leadId }),
            ...(item.serviceCategoryId && { service_category_id: item.serviceCategoryId }),
            ...(item.serviceTypeId && { service_type_id: item.serviceTypeId }),
            notes: item.notes ?? item.remarks ?? null,
            modified_at: new Date(),
            modified_by: item.modifiedBy || item.modified_by || null,
          },
        });
      })
    );

    return result;
  } catch (error) {
    console.error("Update Service Error:", error);
    throw error;
  }
};




module.exports = {
  createDestination,
  //updateDestination,
  getLevelListData,
  getServiceListData,
  createServiceData,
  updateServiceData,
};