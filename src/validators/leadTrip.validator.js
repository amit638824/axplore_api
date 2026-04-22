/**
 * //Trip Validation Schemas
 * //Joi validation schemas for Trip management endpoints
 */

const Joi = require('joi');
const createLeadTripSchema = Joi.object({
  leadId: Joi.string().uuid().required(),
  tripType: Joi.string().max(50).required(),
  tripName: Joi.string().max(200).required(),
  totalBudget: Joi.number().precision(2).required(),
  numberOfTravelers: Joi.number().integer().min(1).required(),
  tripScheduleType: Joi.string().max(30).required(),
  specificTravelDate: Joi.date().optional().allow(null),
  travelMonth: Joi.string().max(20).optional().allow(null),
  checkInDate: Joi.date().required(),
  checkOutDate: Joi.date().required(),
  numberOfNights: Joi.number().integer().min(0).required(),
  financialQuarter: Joi.string().max(10).required(),
  budgetPerPerson: Joi.number().precision(2).optional().allow(null),
  totalTurnover: Joi.number().precision(2).optional().allow(null),
  createdBy: Joi.string().uuid().required(),
  contractingHeadUserId: Joi.string().uuid().optional().allow(null, ""),
  contractingTeamUserIds: Joi.array().items(Joi.string().uuid()).optional().allow(null),
});


const updateLeadTripSchema = Joi.object({
  leadId: Joi.string().uuid().required(),
  tripType: Joi.string().max(50).required(),
  tripName: Joi.string().max(200).required(),
  totalBudget: Joi.number().precision(2).required(),
  numberOfTravelers: Joi.number().integer().min(1).required(),
  tripScheduleType: Joi.string().max(30).required(),
  specificTravelDate: Joi.date().optional().allow(null),
  travelMonth: Joi.string().max(20).optional().allow(null),
  checkInDate: Joi.date().required(),
  checkOutDate: Joi.date().required(),
  numberOfNights: Joi.number().integer().min(0).required(),
  financialQuarter: Joi.string().max(10).required(),
  budgetPerPerson: Joi.number().precision(2).optional().allow(null),
  modifiedBy: Joi.string().uuid().required(),
  contractingHeadUserId: Joi.string().uuid().optional().allow(null, ""),
  contractingTeamUserIds: Joi.array().items(Joi.string().uuid()).optional().allow(null),
});


module.exports = {
  createLeadTripSchema,
  updateLeadTripSchema,
};
