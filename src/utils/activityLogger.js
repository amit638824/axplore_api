const { prisma } = require('../config/database');

/**
 * Log an activity for a lead
 * @param {string} leadId - The ID of the lead
 * @param {string} performedBy - The ID of the user performing the action
 * @param {string} action - The action type (e.g., CREATE, UPLOAD_DOC, STATUS_CHANGE)
 * @param {string} details - Additional details about the action
 */
async function logLeadActivity(leadId, performedBy, action, details = null) {
  try {
    if (!leadId || !performedBy) return;

    await prisma.leadActivityLog.create({
      data: {
        leadId,
        performedBy,
        action,
        details: String(details || '')
      }
    });
  } catch (error) {
    console.error('Failed to log lead activity:', error.message);
    // We don't throw here to avoid breaking the main operation if logging fails
  }
}

module.exports = {
  logLeadActivity
};
