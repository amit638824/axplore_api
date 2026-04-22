/**
 * Trip Info Service
 * //Business logic for Trip Info management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');
const { sendContractingTeamAssignedEmail, sendLeadAssignmentEmail } = require('./mail.service');
const { initTracker, completeTracker } = require('./reminder.service');

const getFullName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

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

const syncContractingAndSendEmails = async (leadId, data, tripResult, executorId) => {
  const existingLead = await prisma.lead.findUnique({
    where: { leadId },
    include: {
      corporate: { select: { corporateName: true } },
      salesUser: { select: { email: true, firstName: true, lastName: true } },
      contractingHead: { select: { email: true, firstName: true, lastName: true } },
      contractingTeam: {
        include: { user: { select: { email: true, firstName: true, lastName: true } } }
      },
      lead_document: {
        where: { is_active: true },
        include: { master_document: true }
      }
    }
  });

  if (!existingLead) return;

  const newHeadUserId = "contractingHeadUserId" in data ? (data.contractingHeadUserId || null) : existingLead.contractingHeadUserId;
  const newTeamUserIds = "contractingTeamUserIds" in data ? (Array.isArray(data.contractingTeamUserIds) ? data.contractingTeamUserIds : []) : null;

  let headChanged = false;
  let newTeamMembers = [];

  if ("contractingHeadUserId" in data && newHeadUserId !== existingLead.contractingHeadUserId) {
    headChanged = true;
  }

  if (newTeamUserIds !== null) {
    const existingTeamIds = existingLead.contractingTeam.map(t => t.userId);
    newTeamMembers = newTeamUserIds.filter(id => !existingTeamIds.includes(id));
  }

  // Update logic in transaction
  if ("contractingHeadUserId" in data || newTeamUserIds !== null) {
    await prisma.$transaction(async (tx) => {
      if ("contractingHeadUserId" in data) {
        await tx.lead.update({
          where: { leadId },
          data: { contractingHeadUserId: newHeadUserId }
        });
      }
      if (newTeamUserIds !== null) {
        await tx.leadContractingTeam.deleteMany({ where: { leadId } });
        if (newTeamUserIds.length > 0) {
          const uniqueTeamIds = [...new Set(newTeamUserIds)];
          await tx.leadContractingTeam.createMany({
            data: uniqueTeamIds.map(tid => ({ leadId, userId: tid, createdBy: executorId }))
          });
        }
      }
    });
  }

  // Dispatch Mails securely
  const leadDisplayName = existingLead.corporate?.corporateName || tripResult.tripName || leadId;
  const documentTitles = getDocumentLinks(existingLead.lead_document);
  const emailOptions = {
    leadCode: existingLead.lead_code,
    documentTitles
  };
  const salesEmail = existingLead.salesUser?.email;

  // 1. If head changed, notify new head
  if (headChanged && newHeadUserId) {
    const headUser = await prisma.appUser.findUnique({ where: { userId: newHeadUserId }, select: { email: true, firstName: true, lastName: true } });
    if (headUser?.email) {
      const fullName = getFullName(headUser);
      await sendLeadAssignmentEmail(headUser.email, fullName, leadDisplayName, 'Dear', 'has been assigned to you as Contracting Head', salesEmail, tripResult, emailOptions).catch(console.error);
    }
  }

  // 2. If team members added, notify them and notify Head/Sales
  if (newTeamMembers.length > 0) {
    const teamUsers = await prisma.appUser.findMany({ where: { userId: { in: newTeamMembers } }, select: { email: true, firstName: true, lastName: true } });
    for (const user of teamUsers) {
      if (user.email) {
        const fullName = getFullName(user);
        await sendLeadAssignmentEmail(user.email, fullName, leadDisplayName, 'Dear', 'has added you to the contracting team for this lead', null, tripResult, emailOptions).catch(console.error);
      }
    }

    const teamMemberNames = teamUsers.map(getFullName).filter(Boolean);

    if (salesEmail) {
      await sendContractingTeamAssignedEmail(salesEmail, getFullName(existingLead.salesUser) || 'SalesREP', leadDisplayName, teamMemberNames, tripResult, emailOptions).catch(console.error);
    }

    const currentHead = newHeadUserId
      ? await prisma.appUser.findUnique({ where: { userId: newHeadUserId }, select: { email: true, firstName: true, lastName: true } })
      : existingLead.contractingHead;
    if (currentHead?.email) {
      await sendContractingTeamAssignedEmail(currentHead.email, getFullName(currentHead) || 'Contracting Head', leadDisplayName, teamMemberNames, tripResult, emailOptions).catch(console.error);
    }
    
    // Complete the reminder tracker when a team is assigned
    await completeTracker(leadId).catch(console.error);
  }

  // 3. If head changed, initialize or update reminder tracker
  if (headChanged && newHeadUserId) {
    const headUser = await prisma.appUser.findUnique({ where: { userId: newHeadUserId }, select: { email: true, firstName: true, lastName: true } });
    if (headUser?.email) {
      const salesEmail = existingLead.salesUser?.email || null;
      await initTracker(
        leadId,
        existingLead.lead_code,
        newHeadUserId,
        salesEmail,
        headUser.email
      ).catch(console.error);
    }
  }

  // 3. If NO contracting changes but Trip Info was saved, send a general update email to existing Head and Sales REP
  if (!headChanged && newTeamMembers.length === 0) {
    const headToNotify = headChanged ? null : (newHeadUserId ? await prisma.appUser.findUnique({ where: { userId: newHeadUserId }, select: { email: true, firstName: true, lastName: true } }) : existingLead.contractingHead);
    
    // Notify Contracting Head about Trip Info update
    if (headToNotify?.email) {
      await sendLeadAssignmentEmail(
        headToNotify.email,
        getFullName(headToNotify),
        leadDisplayName,
        'Dear',
        'trip information has been updated',
        salesEmail,
        tripResult,
        emailOptions
      ).catch(console.error);
    }

    // Notify Team Members about Trip Info update
    if (existingLead.contractingTeam && existingLead.contractingTeam.length > 0) {
      for (const teamMember of existingLead.contractingTeam) {
        const teamUser = teamMember.user || teamMember; // Fallback for safety
        if (teamUser?.email) {
          await sendLeadAssignmentEmail(
            teamUser.email,
            getFullName(teamUser),
            leadDisplayName,
            'Dear',
            'trip information has been updated',
            null,
            tripResult,
            emailOptions
          ).catch(console.error);
        }
      }
    }
    
    // Also notify Sales REP about the update (optional but good for consistency)
    if (salesEmail) {
       await sendLeadAssignmentEmail(
         salesEmail,
         getFullName(existingLead.salesUser),
         leadDisplayName,
         'Dear',
         'trip information has been processed',
         null,
         tripResult,
         emailOptions
       ).catch(console.error);
    }
  }
};

const createLeadTripInfo = async (data, userId) => {
  const leadTripRecord = await prisma.leadTripInfo.create({
    data: {
      leadId: data.leadId,
      tripType: data.tripType,
      tripName: data.tripName,
      totalBudget: data.totalBudget,
      numberOfTravelers: data.numberOfTravelers,
      tripScheduleType: data.tripScheduleType,
      specificTravelDate: data.specificTravelDate,
      travelMonth: data.travelMonth,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      numberOfNights: data.numberOfNights,
      financialQuarter: data.financialQuarter,
      budgetPerPerson: data.budgetPerPerson,
      totalTurnover: data.totalTurnover,
      createdBy: data.createdBy,
    }
  });

  if (data.leadId) {
    await prisma.lead.update({
      where: { leadId: data.leadId },
      data: {
        stage: "PLANNING",
      }
    });

    await syncContractingAndSendEmails(data.leadId, data, leadTripRecord, userId || data.createdBy);
  }

  return leadTripRecord;
};


const updateLeadTripInfo = async (leadId, data, modifiedBy) => {
  // Check if lead exists
  const existingLeadTrip = await prisma.leadTripInfo.findUnique({
    where: { leadId },
  });

  if (!existingLeadTrip) {
    throw new NotFoundError('LeadTrip');
  }

  const leadTripRecord = await prisma.leadTripInfo.update({
    where: { leadId },
    data: {
      tripType: data.tripType,
      tripName: data.tripName,
      totalBudget: data.totalBudget,
      numberOfTravelers: data.numberOfTravelers,
      tripScheduleType: data.tripScheduleType,
      specificTravelDate: data.specificTravelDate,
      travelMonth: data.travelMonth,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      numberOfNights: data.numberOfNights,
      financialQuarter: data.financialQuarter,
      budgetPerPerson: data.budgetPerPerson,
      totalTurnover: data.totalTurnover,
      modifiedAt: new Date(),
      modifiedBy: data.modifiedBy,
    }
  });

  await syncContractingAndSendEmails(leadId, data, leadTripRecord, modifiedBy || data.modifiedBy);

  return leadTripRecord;
};




module.exports = {
  createLeadTripInfo,
  updateLeadTripInfo,
};
