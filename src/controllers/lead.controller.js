/**
 * Lead Controller
 * Handles HTTP requests for lead management endpoints
 */

const leadService = require('../services/lead.service');
const { success, paginated, error: responseError } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadToS3 } = require('../utils/s3Utils');
const { prisma } = require('../config/database');
const { logLeadActivity } = require('../utils/activityLogger');
const { sendLeadAssignmentEmail } = require('../services/mail.service');
const path = require('path');

const getFullName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

const getLeadDisplayName = (lead) =>
  lead?.tripInfo?.tripName ||
  lead?.corporate?.corporateName ||
  lead?.lead_code ||
  lead?.leadId;

const getLeadDocumentTitle = (leadDoc) =>
  leadDoc?.master_document?.document_name ||
  leadDoc?.file_name ||
  'Uploaded document';

const notifyContractingUsersAboutDocument = async (leadId, leadDoc) => {
  const lead = await prisma.lead.findUnique({
    where: { leadId },
    include: {
      tripInfo: true,
      corporate: { select: { corporateName: true } },
      salesUser: { select: { email: true } },
      contractingHead: { select: { email: true, firstName: true, lastName: true } },
      contractingTeam: {
        include: {
          user: { select: { email: true, firstName: true, lastName: true } }
        }
      }
    }
  });

  if (!lead) return;

  const leadDisplayName = getLeadDisplayName(lead);
  const documentTitle = getLeadDocumentTitle(leadDoc);
  const documentName = leadDoc?.master_document?.document_name || leadDoc?.master_document?.document_code || '';
  const fileName = leadDoc?.file_name || '';
  const emailOptions = {
    leadCode: lead.lead_code,
    documentTitles: [{
      title: documentTitle,
      documentName,
      fileName,
      url: leadDoc?.document_url || ''
    }]
  };
  const salesEmail = lead.salesUser?.email || null;

  const recipients = [];
  if (lead.contractingHead?.email) {
    recipients.push({
      email: lead.contractingHead.email,
      name: getFullName(lead.contractingHead) || 'Contracting Head',
      message: 'has a newly uploaded document for Contracting Head review'
    });
  }

  for (const teamMember of lead.contractingTeam || []) {
    const user = teamMember.user;
    if (!user?.email) continue;
    recipients.push({
      email: user.email,
      name: getFullName(user) || 'Contracting Team',
      message: 'has a newly uploaded document for Contracting Team review'
    });
  }

  for (const recipient of recipients) {
    await sendLeadAssignmentEmail(
      recipient.email,
      recipient.name,
      leadDisplayName,
      'Dear',
      recipient.message,
      salesEmail,
      lead.tripInfo,
      emailOptions
    ).catch((error) => {
      console.error('Failed to send document upload notification:', error.message);
    });
  }
};

/**
 * Create a new lead
 */
const createLead = asyncHandler(async (req, res) => {
  const isUpdate = !!req.body.leadId;
  const lead = await leadService.createLead(req.body, req.userId);
  const message = isUpdate ? 'Lead updated successfully' : 'Lead created successfully';
  const statusCode = isUpdate ? 200 : 201;
  return success(res, lead, message, statusCode);
});

/**
 * Get lead by ID
 */
const getLeadById = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const leadData = await leadService.getLeadById(leadId);

  if (!leadData) {
    return responseError(res, 404, 'Lead not found');
  }

  // ✅ Convert BigInt file_size to string for JSON serialization
  if (leadData.lead_document) {
    leadData.lead_document = leadData.lead_document.map(doc => ({
      ...doc,
      file_size: doc.file_size ? doc.file_size.toString() : null
    }));
  }

  return success(res, leadData, 'Lead retrieved successfully');
});



const getTotalLeads = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const userId = req.user.userId;
  const createdBy = userId;
  const activeRoleId = req.activeRoleId;
  const leadTotal = await leadService.getTotalLeads(createdBy, email, activeRoleId);
  return success(res, leadTotal, 'Total Leads successfully');
});

const getTotalLeadStatus = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const userId = req.user.userId;
  const createdBy = userId;
  const activeRoleId = req.activeRoleId;

  const leadStatusTotal = await leadService.getTotalLeadStatus(createdBy, email, activeRoleId);
  return success(res, leadStatusTotal, 'Total Lead Status successfully');
});

/**
 * Get leads with filters and pagination
 * Accepts pagination (page, limit) and filters via query or body
 */
const getLeads = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const userId = req.user.userId;
  const activeRoleId = req.activeRoleId;

  const createdBy = userId;
  const params = { ...req.query, ...req.body };
  const filters = { ...params };
  delete filters.createdBy;
  const pagination = {
    page: params.page,
    limit: params.limit,
  };
  const { leads, pagination: paginationResult } = await leadService.getLeads(createdBy, email, filters, pagination, activeRoleId);
  return paginated(res, leads, paginationResult, 'Leads retrieved successfully');
});

//get all lead data againest leaid id
const getAllLeadData = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const leadData = await leadService.getAllLeadData(leadId);
  return success(res, leadData, 'Lead data retrieved successfully');
});

/**
 * Update lead
 */
const updateLead = asyncHandler(async (req, res) => {
  const { leadId, modifiedBy } = req.body;
  const lead = await leadService.updateLead(leadId, req.body, modifiedBy);
  return success(res, lead, 'Lead updated successfully');
});

/**
 * Update lead status only
 */
const updateLeadStatus = asyncHandler(async (req, res) => {
  const { leadId, modifiedBy } = req.body;
  const lead = await leadService.updateLeadStatusData(leadId, req.body, modifiedBy);

  // 📝 Log activity
  await logLeadActivity(leadId, modifiedBy, 'STATUS_CHANGE', `Status updated to: ${req.body.leadStatusId}`);

  return success(res, lead, 'Lead status updated  successfully');
});


/**
 * Update lead status  Requirement Notes only
 */
const updateLeadRequirementNotes = asyncHandler(async (req, res) => {
  const { leadId, modifiedBy } = req.body;
  const leadRequirementNotes = await leadService.updateLeadRequirementNote(leadId, req.body, modifiedBy);
  return success(res, leadRequirementNotes, 'Lead status Requirement Notes updated  successfully');
});

/**
 * Delete lead
 */
const deleteLead = asyncHandler(async (req, res) => {
  const { leadId } = req.params.leadId ? req.params : req.body;

  if (!leadId) {
    return responseError(res, 400, 'Lead ID is required');
  }

  await leadService.deleteLead(leadId);
  return success(res, null, 'Lead deleted successfully');
});

/** Store lead pickup from lead hub
 */
const storeLeadPickup = asyncHandler(async (req, res) => {

  const data = Array.isArray(req.body) ? req.body : [];

  if (data.length === 0) {
    return success(res, null, "No pickup data provided");
  }


  const formattedData = data.map(item => ({
    lead_id: item.lead_id ?? null,
    hub_id: item.hub_id ?? null,
    traveller_count: item.traveller_count ?? 0,
    remarks: item.remarks ?? "",
    created_by: req.user?.userId ?? req.userId ?? null,
    option_no: item.option_no ?? null,
  }));
  // return success(res, formattedData, "Lead pickup data");
  const createdPickupHubs = await leadService.createleadservice(formattedData);

  return success(res, createdPickupHubs, "Lead pickup stored successfully !");

});

/**
 * List master pickup hubs
 */
const listMasterPickupHubs = asyncHandler(async (req, res) => {
  const hubs = await leadService.listMasterPickupHubs(req.query || {});
  return success(res, hubs, 'Master pickup hubs retrieved successfully');
});

/**
 * Confirm Lead (Win/Lost) with checklist and file uploads
 */
const confirmLead = asyncHandler(async (req, res) => {
  const userId = req.body.modifiedBy || req.body.createdBy || req.user?.userId || req.userId;
  const lead = await leadService.confirmLead(req.body, req.files, userId);
  return success(res, lead, 'Lead confirmed successfully');
});

const getDestinationReport = asyncHandler(async (req, res) => {
  const destinationReport = await leadService.getDestinationReport(req.body || {});
  return success(res, destinationReport, 'Destination report retrieved successfully');
});

/**
 * NEW API: Upload Lead Document to S3 and save in lead_document table
 */
const uploadLeadDocumentS3 = asyncHandler(async (req, res) => {
  try {
    const { leadId, documentId } = req.body;
    const file = req.files?.file; // with express-fileupload
    const userId = req.user?.userId;

    if (!file) {
      return responseError(res, 400, 'No file uploaded');
    }

    // File size validation (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      return responseError(res, 400, `File size (${sizeInMB}MB) exceeds the 10MB limit.`);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!leadId || !uuidRegex.test(leadId)) {
      return responseError(res, 400, 'Invalid or missing leadId. Expected UUID.');
    }

    // ✅ 1. Resolve master_document record
    let docRecord = null;
    if (uuidRegex.test(documentId)) {
      docRecord = await prisma.master_document.findUnique({
        where: { document_id: documentId }
      });
    }

    // Final resolve: Use master_document if found, else fallback
    let actualDocId = '7106d3f1-f046-4c87-a6c7-8d077cda35f5'; // Default fallback
    let documentCode = 'DOCUMENT';

    if (docRecord) {
      actualDocId = docRecord.document_id;
      documentCode = (docRecord.document_code || 'DOCUMENT').replace(/\s+/g, '_');
    } else {
      // If fallback UUID doesn't exist, pick the first available master document to avoid FK failure
      const fallbackDoc = await prisma.master_document.findFirst();
      if (fallbackDoc) {
        actualDocId = fallbackDoc.document_id;
        documentCode = (fallbackDoc.document_code || 'OTHER').replace(/\s+/g, '_').toUpperCase();
      }
    }



    // Generate target filename here (S3 key)
    const ext = path.extname(file.name) || '.pdf';
    const folder = 'Lead';
    const fileName = `${documentCode}_${leadId}_${Date.now()}${ext}`;
    const s3Key = `${folder}/${leadId}/${fileName}`;

    // 🚀 2. Upload to S3
    const uploadResult = await uploadToS3(file, s3Key);

    // 3. Store in database
    const leadDoc = await prisma.lead_document.create({
      data: {
        lead_id: leadId,
        document_id: actualDocId,
        document_url: uploadResult.url,
        file_name: req.body.customDocName || file.name || 'document.pdf',
        mime_type: file.mimetype || 'application/pdf',
        file_size: file.size ? BigInt(file.size) : null,
        created_by: userId,
        is_active: true
      },
      include: {
        master_document: true
      }
    });

    // Convert BigInt to string for response
    const responseData = {
      ...leadDoc,
      file_size: leadDoc.file_size ? leadDoc.file_size.toString() : null
    };

    //  Log activity
    await logLeadActivity(leadId, userId, 'UPLOAD_DOC', `Document uploaded: ${file.name}`);

    // await notifyContractingUsersAboutDocument(leadId, leadDoc);

    return success(res, responseData, 'Document uploaded successfully');

  } catch (err) {
    console.error("Critical Upload Error:", err);
    return responseError(res, 500, `Internal Server Error: ${err.message || 'Unknown error'}`);
  }
});

module.exports = {
  createLead,
  getLeadById,
  getLeads,
  updateLead,
  deleteLead,
  updateLeadStatus,
  updateLeadRequirementNotes,
  getTotalLeads,
  getTotalLeadStatus,
  storeLeadPickup,
  listMasterPickupHubs,
  confirmLead,
  getAllLeadData,
  getDestinationReport,
  uploadLeadDocumentS3,
  getLeadHistory: asyncHandler(async (req, res) => {
    const { leadId } = req.params;
    const history = await leadService.getLeadHistory(leadId);
    return success(res, history, 'Lead history retrieved successfully');
  }),
  toggleLeadDocumentStatus: asyncHandler(async (req, res) => {
    const { leadDocumentId, leadId } = req.body;
    const userId = req.body.modifiedBy || req.user?.userId || req.userId;

    if (!leadDocumentId) {
      return responseError(res, 400, 'leadDocumentId is required');
    }

    const doc = await leadService.toggleLeadDocumentStatus(leadDocumentId, leadId, userId);

    const sanitizedDoc = {
      ...doc,
      file_size: doc.file_size ? doc.file_size.toString() : null
    };

    return success(res, sanitizedDoc, `Document ${doc.is_active ? 'activated' : 'deactivated'} successfully`);
  }),
  deactivateLeadPickupHub: asyncHandler(async (req, res) => {
    const { leadHubId } = req.body;
    const userId = req.body.modifiedBy || req.user?.userId || req.userId;

    if (!leadHubId) {
      return responseError(res, 400, 'leadHubId is required');
    }

    const result = await leadService.deactivateLeadPickupHub(leadHubId, userId);
    return success(res, result, 'Lead pickup hub deactivated successfully');
  }),

  getLeadsByInvolvement: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const params = { ...req.query, ...req.body };
    const pagination = {
      page: parseInt(params.page) || 1,
      limit: parseInt(params.limit) || 25,
    };
    const { leads, pagination: paginationResult } = await leadService.getLeadsByInvolvement(userId, pagination);
    return paginated(res, leads, paginationResult, 'Leads for the specified user retrieved successfully');
  }),
};

