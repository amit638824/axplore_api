/**
 * costsheet Service
 * Business logic for costsheet management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');
const upload = require('../utils/multerConfig');
const path = require('path');
const fs = require('fs');
const { uploadToS3 } = require('../utils/s3Utils');

/**
 * Get costsheet list
 */

const getCostsheet = async (data) => {
  const Costsheet = await prisma.costsheetTemplate.findMany({
    where: {
      AND: [
        { status: "ACTIVE" },
        //   { createdBy: data.createdBy } // second condition
      ]
    },
    select: {
      costsheetTemplateId: true, leadSegmentId: true, templateName: true, description: true, templateStructure: true, version: true,
    },
  });
  if (!Costsheet) {
    throw new NotFoundError('Costsheet');
  }
  return Costsheet;
};



const getCostsheetById = async (data) => {
  const Costsheet = await prisma.costsheetTemplate.findMany({
    where: {
      AND: [
        { costsheetTemplateId: data.costsheetTemplateId },
        { status: "ACTIVE" },
      ]
    },
    select: {
      costsheetTemplateId: true, leadSegmentId: true, templateName: true, description: true, templateStructure: true, version: true,
    },
  });
  if (!Costsheet) {
    throw new NotFoundError('Costsheet');
  }
  return Costsheet;
};


const addCostsheet = async (data, file) => {
  let { leadId, optionNo, costsheetTemplateId, templateSnapshot, sheetData, totalCost, sellingPrice, totalGop, gopPerson, margin, createdBy, modifiedBy, costSheetType } = data;

  // Validation
  if (!leadId) {
    throw new ValidationError('leadId is required');
  }
  if (!optionNo) {
    throw new ValidationError('optionNo is required');
  }
  if (costSheetType === 'online' && !costsheetTemplateId) {
    throw new ValidationError('costsheetTemplateId is required for online mode');
  }

  const uploadedFilePath = null; // Will be updated with S3 URL later if file exists

  // Fallback for missing/empty fields (Dummy Data)
  if (!costsheetTemplateId) {
    const firstTemplate = await prisma.costsheetTemplate.findFirst({ select: { costsheetTemplateId: true } });
    costsheetTemplateId = firstTemplate?.costsheetTemplateId || null;
  }

  // Fallback for createdBy (Dummy Data if no user session found)
  if (!createdBy || !modifiedBy) {
    const firstUser = await prisma.appUser.findFirst({ select: { userId: true } });
    createdBy = createdBy || firstUser?.userId;
    modifiedBy = modifiedBy || firstUser?.userId;
  }

  // Safe JSON parsing
  const parseJson = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return {}; }
    }
    return val || {};
  };

  templateSnapshot = parseJson(templateSnapshot);
  sheetData = parseJson(sheetData);

  totalCost = totalCost ? Number(totalCost) : 0;
  sellingPrice = sellingPrice ? Number(sellingPrice) : 0;
  totalGop = totalGop ? Number(totalGop) : 0;
  gopPerson = gopPerson ? Number(gopPerson) : 0;
  margin = typeof margin === 'string' ? margin === 'true' : !!margin;

  // Step 1: Check if record exists
  let existing = null;
  if (data.leadCostsheetId) {
    existing = await prisma.leadCostsheet.findUnique({
      where: { leadCostsheetId: data.leadCostsheetId },
    });
  } else if (leadId && optionNo) {
    existing = await prisma.leadCostsheet.findFirst({
      where: {
        leadId,
        optionNo: Number(optionNo),
      },
    });
  }

  let result;

  if (existing) {
    // Step 2: Update
    result = await prisma.leadCostsheet.update({
      where: { leadCostsheetId: existing.leadCostsheetId },
      data: {
        costsheet_template: costsheetTemplateId ? { connect: { costsheetTemplateId } } : undefined,
        templateSnapshot,
        sheetData,
        totalCost,
        sellingPrice,
        totalGop,
        gop_person: gopPerson,
        margin,
        is_active: true,
        modifiedAt: new Date(),
        modifiedBy: modifiedBy,
        costSheetType: costSheetType || 'upload',
        uploadedFilePath: uploadedFilePath || existing.uploadedFilePath,
      },

    });
  } else {
    // Step 3: Create new record
    result = await prisma.leadCostsheet.create({
      data: {
        costsheet_template: { connect: { costsheetTemplateId } }, // Still required by DB, using fallback found above
        lead: { connect: { leadId } },
        optionNo: Number(optionNo),
        templateSnapshot,
        sheetData,
        totalCost,
        sellingPrice,
        totalGop,
        gop_person: gopPerson,
        margin,
        createdBy: createdBy,
        costSheetType: costSheetType || 'upload',
        uploadedFilePath,
      },
    });

    await prisma.lead.update({
      where: { leadId: data.leadId },
      data: {
        stage: "PROPOSAL",
      }
    });

  }
  if (data.leadId) {
    // S3 Upload logic
    if (costSheetType === 'upload' && file) {
      try {
        // Validation: Check file extension
        const allowedExtensions = ['.xlsx', '.xls', '.csv', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          throw new ValidationError(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
        }

        // Generate S3 Key
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const s3FileName = `costsheet_${result.leadCostsheetId}_${dateStr}${ext}`;
        const s3Key = `Lead/${leadId}/${s3FileName}`;

        // Upload to S3
        const uploadResult = await uploadToS3({
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname
        }, s3Key);

        // Update DB with S3 URL
        result = await prisma.leadCostsheet.update({
          where: { leadCostsheetId: result.leadCostsheetId },
          data: {
            uploadedFilePath: uploadResult.url
          }
        });
      } catch (uploadError) {
        console.error("S3 Upload Error:", uploadError);
        // Fallback to local if S3 fails? Or throw? 
        // User said "bss file upload wo s3 bucket se hoga", so we should throw if it fails or log it.
        throw uploadError;
      }
    }
  }
  return result;
};

const deactivateCostsheet = async (data) => {
  const { leadCostsheetId, modifiedBy } = data;

  const result = await prisma.leadCostsheet.update({
    where: { leadCostsheetId },
    data: {
      is_active: false,
      modifiedAt: new Date(),
      modifiedBy: modifiedBy,
    },
  });

  return result;
};

module.exports = {
  getCostsheet,
  getCostsheetById,
  addCostsheet,
  deactivateCostsheet,
};

