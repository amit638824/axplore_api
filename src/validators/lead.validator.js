/**
 * Lead Validation Schemas
 * Joi validation schemas for lead management endpoints
 */

const Joi = require('joi');

const createLeadSchema = Joi.object({
  leadId: Joi.string().uuid().optional(),
  leadSegmentId: Joi.string().uuid().required(),
  corporateId: Joi.string().uuid().required(),
  divisionId: Joi.string().uuid().required(),
  subDivisionId: Joi.string().uuid().required(),
  contactPersonId: Joi.string().uuid().optional(),
  contactMobile: Joi.string().pattern(/^[0-9]{10}$/).optional(),
  contactEmail: Joi.string().email().optional(),
  salesUserId: Joi.string().uuid().required(),
  salesBranchId: Joi.string().uuid().required(),
  contractingHeadUserId: Joi.string().uuid().optional(),
  contractingTeamUserIds: Joi.array().items(Joi.string().uuid()).optional(),
  leadStatusId: Joi.string().uuid().required(),
  remarks: Joi.string().max(1000).optional(),
  requirementNotes: Joi.string().max(5000).optional(),
  modifiedBy: Joi.string().uuid().optional(),
  tripInfo: Joi.object({
    tripType: Joi.string().valid('domestic', 'international').required(),
    tripName: Joi.string().min(3).max(200).required(),
    totalBudget: Joi.number().positive().required(),
    numberOfTravelers: Joi.number().integer().positive().required(),
    tripScheduleType: Joi.string().valid('specific_date', 'month', 'flexible').required(),
    specificTravelDate: Joi.date().optional(),
    travelMonth: Joi.string().optional(),
    checkInDate: Joi.date().required(),
    checkOutDate: Joi.date().greater(Joi.ref('checkInDate')).required(),
    numberOfNights: Joi.number().integer().positive().required(),
    financialQuarter: Joi.string().valid('Q1', 'Q2', 'Q3', 'Q4').required(),
    budgetPerPerson: Joi.number().positive().optional(),
    totalTurnover: Joi.number().positive().optional(),
  }).optional(),
  destinations: Joi.array()
    .items(
      Joi.object({
        optionNo: Joi.number().integer().positive().required(),
        sequenceNo: Joi.number().integer().positive().required(),
        fromCountryId: Joi.string().uuid().required(),
        fromCityId: Joi.string().uuid().required(),
        toCountryId: Joi.string().uuid().required(),
        toCityId: Joi.string().uuid().required(),
        numberOfTravelers: Joi.number().integer().positive().required(),
        travelDate: Joi.date().optional(),
        isExtendedTrip: Joi.boolean().optional(),
        services: Joi.array()
          .items(
            Joi.object({
              serviceCategoryId: Joi.string().uuid().required(),
              serviceTypeId: Joi.string().uuid().required(),
              serviceLevelId: Joi.string().uuid().required(),
              remarks: Joi.string().max(1000).optional(),
            })
          )
          .optional(),
      })
    )
    .min(1)
    .optional(),
  pickupHubs: Joi.array()
    .items(
      Joi.object({
        hubId: Joi.string().uuid().optional(),
        hub_id: Joi.string().uuid().optional(),
        pickupHubId: Joi.string().uuid().optional(), // backward compatibility
        travellerCount: Joi.number().integer().positive().required(),
        remarks: Joi.string().max(1000).optional(),
      }).or('hubId', 'hub_id', 'pickupHubId')
    )
    .optional(),
});

const updateLeadSchema = Joi.object({
  leadId: Joi.string().uuid().optional(),
  leadSegmentId: Joi.string().uuid().optional(),
  contactPersonId: Joi.string().uuid().optional().allow(null),
  contactMobile: Joi.string().pattern(/^[0-9]{10}$/).optional().allow(null),
  contactEmail: Joi.string().email().optional().allow(null),
  salesUserId: Joi.string().uuid().optional(),
  salesBranchId: Joi.string().uuid().optional(),
  contractingHeadUserId: Joi.string().uuid().optional().allow(null),
  contractingTeamUserIds: Joi.array().items(Joi.string().uuid()).optional(),
  leadStatusId: Joi.string().uuid().optional(),
  remarks: Joi.string().max(1000).optional().allow(null),
  requirementNotes: Joi.string().max(5000).optional().allow(null),
  modifiedBy: Joi.string().uuid().optional(),
});

const updateLeadStatusSchema = Joi.object({
  leadId: Joi.string().uuid().optional(),
  modifiedBy: Joi.string().uuid().optional(),
  leadStatusId: Joi.string().uuid().optional(),
});

const updateLeadRequirementNotesSchema = Joi.object({
  leadId: Joi.string().uuid().optional(),
  modifiedBy: Joi.string().uuid().optional(),
  requirementNotes: Joi.string().max(5000).optional().allow(null),
});

const queryLeadSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  leadSegmentId: Joi.string().uuid().optional(),
  corporateId: Joi.string().uuid().optional(),
  leadStatusId: Joi.string().uuid().optional(),
  salesUserId: Joi.string().uuid().optional(),
  search: Joi.string().max(100).optional(),
  sortBy: Joi.string().valid('createdAt', 'modifiedAt', 'leadStatusId').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

/** Body schema for POST getLeads: createdBy + optional pagination/filters (same as query) */
const getLeadsBodySchema = Joi.object({
  createdBy: Joi.string().uuid().required(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  leadSegmentId: Joi.string().uuid().optional(),
  corporateId: Joi.string().uuid().optional(),
  leadStatusId: Joi.string().uuid().optional(),
  salesUserId: Joi.string().uuid().optional(),
  search: Joi.string().max(100).optional(),
  sortBy: Joi.string().valid('createdAt', 'modifiedAt', 'leadStatusId').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

const destinationReportSchema = Joi.object({
  leadId: Joi.string().uuid().required(),
  optionNo: Joi.number().integer().min(1).required(),
});

const deactivateLeadPickupHubSchema = Joi.object({
  leadHubId: Joi.string().uuid().required(),
  modifiedBy: Joi.string().uuid().optional(),
});


module.exports = {
  createLeadSchema,
  updateLeadSchema,
  queryLeadSchema,
  getLeadsBodySchema,
  updateLeadStatusSchema,
  updateLeadRequirementNotesSchema,
  destinationReportSchema,
  deactivateLeadPickupHubSchema,

};
