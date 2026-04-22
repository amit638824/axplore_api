
// const createLead = async (leadData, userId) => {
//   // Validate corporate structure
//   const corporate = await prisma.corporate.findUnique({
//     where: { corporateId: leadData.corporateId },
//     include: {
//       divisions: {
//         where: { divisionId: leadData.divisionId },
//         include: {
//           subDivisions: {
//             where: { subDivisionId: leadData.subDivisionId },
//           },
//         },
//       },
//     },
//   });

//   if (!corporate) {
//     throw new NotFoundError('Corporate');
//   }

//   if (!corporate.divisions.length) {
//     throw new ValidationError('Invalid division for the selected corporate');
//   }

//   if (!corporate.divisions[0].subDivisions.length) {
//     throw new ValidationError('Invalid sub-division for the selected division');
//   }


//   // ✅ FIXED CREATE
//   const lead = await prisma.$transaction(async (tx) => {

//     const newLead = await tx.lead.create({
//       data: {
//         leadSegmentId: leadData.leadSegmentId,          // ✅ FIXED
//         corporateId: leadData.corporateId,              // ✅ FIXED
//         divisionId: leadData.divisionId,                // ✅ FIXED
//         subDivisionId: leadData.subDivisionId,          // ✅ FIXED
//         contactPersonId: leadData.contactPersonId || null,
//         contactMobile: leadData.contactMobile || null,
//         contactEmail: leadData.contactEmail || null,
//         salesUserId: leadData.salesUserId,              // ✅ FIXED
//         salesBranchId: leadData.salesBranchId,          // ✅ FIXED
//         contractingHeadUserId: leadData.contractingHeadUserId || null,
//         leadStatusId: leadData.leadStatusId,            // ✅ FIXED
//         remarks: leadData.remarks || null,
//         requirementNotes: leadData.requirementNotes || null,
//         createdBy: leadData.salesUserId                               // ✅ FIXED
//       },
//     });


//     // Trip Info
//     if (leadData.tripInfo) {
//       await tx.leadTripInfo.create({
//         data: {
//           leadId: newLead.leadId,
//           ...leadData.tripInfo,
//           createdBy: userId,
//         },
//       });
//     }


//     // Destinations
//     if (leadData.destinations?.length) {

//       for (const destination of leadData.destinations) {

//         const { services, ...destData } = destination;

//         const newDestination = await tx.leadDestination.create({
//           data: {
//             leadId: newLead.leadId,
//             ...destData,
//             createdBy: userId,
//           },
//         });

//         if (services?.length) {

//           await tx.leadDestinationService.createMany({
//             data: services.map(service => ({
//               leadDestinationId: newDestination.leadDestinationId,
//               ...service,
//               createdBy: userId,
//             })),
//           });

//         }
//       }
//     }


//     // Pickup hubs
//     if (leadData.pickupHubs?.length) {

//       await tx.leadPickupHub.createMany({
//         data: leadData.pickupHubs.map(hub => ({
//           leadId: newLead.leadId,
//           ...hub,
//           createdBy: userId,
//         })),
//       });

//     }


//     return newLead;
//   });


//   return getLeadById(lead.leadId);

// };
