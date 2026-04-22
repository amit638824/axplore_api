/**
 * Reminder Service
 * Logic for processing lead assignment reminders
 */

const { prisma } = require('../config/database');
const { sendLeadReminderEmail } = require('./mail.service');

/**
 * Initialize or reset a tracker for a lead
 */
const initTracker = async (leadId, leadCode, headUserId, salesEmail, headEmail) => {
  const intervalMinutes = 1440; // 24 hours
  const maxReminders = 3;

  return await prisma.lead_assignment_tracker.upsert({
    where: { tracker_id: (await prisma.lead_assignment_tracker.findFirst({ where: { lead_id: leadId, is_active: true } }))?.tracker_id || '00000000-0000-0000-0000-000000000000' },
    update: {
      contracting_head_user_id: headUserId,
      email_to: headEmail,
      email_cc: salesEmail,
      reminder_stage: 0,
      next_reminder_at: new Date(Date.now() + intervalMinutes * 60 * 1000),
      is_completed: false,
      is_active: true,
      updated_at: new Date(),
    },
    create: {
      lead_id: leadId,
      lead_code: leadCode,
      contracting_head_user_id: headUserId,
      email_to: headEmail,
      email_cc: salesEmail,
      reminder_stage: 0,
      max_reminders: maxReminders,
      reminder_interval_minutes: intervalMinutes,
      next_reminder_at: new Date(Date.now() + intervalMinutes * 60 * 1000),
      is_active: true,
      is_completed: false,
    },
  });
};

/**
 * Mark tracker as completed when team is assigned
 */
const completeTracker = async (leadId) => {
  return await prisma.lead_assignment_tracker.updateMany({
    where: { lead_id: leadId, is_active: true },
    data: {
      is_completed: true,
      is_active: false,
      team_assigned: true,
      team_assigned_at: new Date(),
      updated_at: new Date(),
    },
  });
};

/**
 * Process all pending reminders
 */
const processReminders = async () => {
  console.log('--- Processing Lead Assignment Reminders ---');

  const now = new Date();

  const pendingTrackers = await prisma.lead_assignment_tracker.findMany({
    where: {
      is_active: true,
      is_completed: false,
      next_reminder_at: { lte: now },
    },
  });


  for (const tracker of pendingTrackers) {
    try {
      // Check if we already reached max reminders
      if ((tracker.reminder_stage || 0) >= (tracker.max_reminders || 3)) {
        await prisma.lead_assignment_tracker.update({
          where: { tracker_id: tracker.tracker_id },
          data: { is_active: false, updated_at: now }
        });
        continue;
      }
      // Fetch trip details for the email
      const lead = await prisma.lead.findUnique({
        where: { leadId: tracker.lead_id },
        include: { tripInfo: true }
      });

      if (!lead || !tracker.email_to) {
        // Mark as inactive if lead doesn't exist or email missing
        await prisma.lead_assignment_tracker.update({
          where: { tracker_id: tracker.tracker_id },
          data: { is_active: false }
        });
        continue;
      }

      // Check if team is already assigned (double check)
      const teamCount = await prisma.leadContractingTeam.count({
        where: { leadId: tracker.lead_id }
      });

      if (teamCount > 0) {
        await completeTracker(tracker.lead_id);
        continue;
      }

      // Send email
      const headUser = await prisma.appUser.findUnique({
        where: { userId: tracker.contracting_head_user_id },
        select: { firstName: true, lastName: true }
      });

      const fullName = headUser ? `${headUser.firstName} ${headUser.lastName}`.trim() : 'Contracting Head';
      const leadDisplayName = lead.tripInfo?.tripName || lead.lead_code || tracker.lead_code;

      const nextStage = (tracker.reminder_stage || 0) + 1;

      await sendLeadReminderEmail(
        tracker.email_to,
        fullName,
        leadDisplayName,
        nextStage,
        tracker.max_reminders,
        tracker.email_cc,
        lead.tripInfo,
        { leadCode: tracker.lead_code }
      );

      // Update tracker
      const nextReminderAt = new Date(now.getTime() + tracker.reminder_interval_minutes * 60 * 1000);

      await prisma.lead_assignment_tracker.update({
        where: { tracker_id: tracker.tracker_id },
        data: {
          reminder_stage: nextStage,
          last_reminder_sent_at: now,
          next_reminder_at: nextReminderAt,
          updated_at: now,
          // If this was the last reminder, we could mark as inactive or keep it
          is_active: nextStage < tracker.max_reminders
        }
      });

    } catch (error) {
      console.error(`Error processing reminder for tracker ${tracker.tracker_id}:`, error.message);
    }
  }
};

module.exports = {
  initTracker,
  completeTracker,
  processReminders,
};
