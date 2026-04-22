const path = require("path");
const fs = require("fs");
const { prisma } = require("../config/database");
const { ValidationError, NotFoundError } = require("../utils/errors");
const { uploadToS3 } = require("../utils/s3Utils");

/**
 * Save (Upsert) a Lead Proposal
 */
const saveLeadProposal = async (data, file) => {
  let {
    leadId,
    templateId,
    optionNo,
    proposalName,
    renderedHtml,
    dataSnapshot,
    documentUrl,
    proposalType,
    status = "draft",
    createdBy,
    modifiedBy,
  } = data;

  if (!leadId) throw new ValidationError("leadId is required");
  if (optionNo === undefined || optionNo === null) throw new ValidationError("optionNo is required");

  // Numeric conversion (from FormData)
  optionNo = Number(optionNo);

  // Handle S3 Upload if file provided
  if (file) {
    const ext = path.extname(file.originalname);
    const fileName = `Proposal_${leadId}_Option${optionNo}_${Date.now()}${ext}`;
    const s3Key = `Proposal/${leadId}/${fileName}`;

    // Use file buffer directly (Multer memoryStorage)
    const fileData = {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname
    };

    const uploadResult = await uploadToS3(fileData, s3Key);
    documentUrl = uploadResult.url;
  }

  // Verify lead exists
  const lead = await prisma.lead.findUnique({ where: { leadId } });
  if (!lead) throw new NotFoundError("Lead");

  // Verify template exists if provided
  if (templateId) {
    const template = await prisma.proposalTemplate.findUnique({ where: { templateId } });
    if (!template) throw new NotFoundError("Template");
  }

  // Upsert using the unique constraint [leadId, optionNo]
  const proposal = await prisma.leadProposal.upsert({
    where: {
      leadId_optionNo: {
        leadId,
        optionNo,
      },
    },
    update: {
      template: templateId ? { connect: { templateId } } : { disconnect: true },
      proposalName: proposalName || null,
      renderedHtml: renderedHtml || null,
      dataSnapshot: dataSnapshot || null,
      documentUrl: documentUrl || null,
      proposalType: proposalType || "ONLINE",
      status,
      modifier: modifiedBy ? { connect: { userId: modifiedBy } } : undefined,
      updatedAt: new Date(),
    },
    create: {
      lead: { connect: { leadId } },
      template: templateId ? { connect: { templateId } } : undefined,
      optionNo,
      proposalName: proposalName || null,
      renderedHtml: renderedHtml || null,
      dataSnapshot: dataSnapshot || null,
      documentUrl: documentUrl || null,
      proposalType: proposalType || "ONLINE",
      status,
      creator: createdBy ? { connect: { userId: createdBy } } : undefined,
    },
  });

  // Update lead stage to "Proposal"
  if (leadId) {
    await prisma.lead.update({
      where: { leadId },
      data: {
        stage: "Proposal",
      }
    });
  }

  return proposal;
};

/**
 * Get all proposals for a lead
 */
const getLeadProposals = async (leadId) => {
  if (!leadId) throw new ValidationError("leadId is required");
  return await prisma.leadProposal.findMany({
    where: { leadId },
    include: {
      template: {
        select: {
          templateName: true,
        },
      },
      creator: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      modifier: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { optionNo: "asc" },
  });
};

/**
 * Delete a lead proposal
 */
const deleteLeadProposal = async (proposalId) => {
  if (!proposalId) throw new ValidationError("proposalId is required");
  return await prisma.leadProposal.delete({
    where: { proposalId },
  });
};

module.exports = {
  saveLeadProposal,
  getLeadProposals,
  deleteLeadProposal,
};
