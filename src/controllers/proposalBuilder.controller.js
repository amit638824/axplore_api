const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { asyncHandler } = require("../middleware/errorHandler");
const proposalBuilderService = require("../services/proposalBuilder.service");
const leadProposalService = require("../services/leadProposal.service");
const { generateGifPreview } = require("../utils/ffmpeg");
const { pool } = require("../config/database");
const { ValidationError } = require("../utils/errors");

// Multer storage for proposal builder uploads - using memoryStorage for S3 workflows
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^image\//.test(file.mimetype) || /^video\//.test(file.mimetype) || file.mimetype === "application/pdf";
    if (!allowed) return cb(new Error("Only images, videos, and PDF documents allowed"));
    cb(null, true);
  },
});

const listTemplates = asyncHandler(async (req, res) => {
  const rows = await proposalBuilderService.listTemplates();
  res.json(rows);
});

const getTemplate = asyncHandler(async (req, res) => {
  const t = await proposalBuilderService.getTemplateById(req.params.id);
  res.json(t);
});

const createTemplate = asyncHandler(async (req, res) => {
  const id = await proposalBuilderService.createTemplate(req.body || {}, req.userId ?? null);
  res.status(201).json({ id });
});

const updateTemplate = asyncHandler(async (req, res) => {
  await proposalBuilderService.updateTemplate(req.params.id, req.body || {}, req.userId ?? null);
  res.json({ ok: true });
});

const deleteTemplate = asyncHandler(async (req, res) => {
  await proposalBuilderService.deleteTemplate(req.params.id, req.userId ?? null);
  res.json({ ok: true });
});

const duplicateTemplate = asyncHandler(async (req, res) => {
  const newId = await proposalBuilderService.duplicateTemplate(req.params.id, req.userId ?? null);
  res.status(201).json({ id: newId });
});

const { uploadToS3 } = require("../utils/s3Utils");

const uploadMedia = [
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ValidationError("No file uploaded");

    const templateId = req.body?.templateId || req.body?.template_id;
    await proposalBuilderService.assertTemplateExists(templateId);

    const isVideo = /^video\//.test(req.file.mimetype);
    const fileType = isVideo ? "video" : /^image\//.test(req.file.mimetype) ? "image" : "document";

    const insertMedia = async (relPath, type, mime, s3Bucket, s3Url) => {
      const { rows } = await pool.query(
        `INSERT INTO proposal_template_media
          (template_id, file_type, original_filename, s3_bucket, s3_key, mime_type, file_size, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING media_id`,
        [
          templateId,
          type,
          req.file.originalname,
          s3Bucket,
          relPath,
          mime,
          req.file.size ?? null,
          req.userId ?? null,
        ],
      );
      return rows[0]?.media_id ?? null;
    };

    // Upload main file to S3
    const s3Key = `ProposalMedia/${templateId}/${Date.now()}_${req.file.originalname}`;
    const fileData = {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname
    };
    const uploadResult = await uploadToS3(fileData, s3Key);
    const mediaId = await insertMedia(s3Key, fileType, req.file.mimetype, "S3", uploadResult.url);

    let previewGifUrl = null;
    let previewGifId = null;

    // Note: GIF preview generation skipped in memoryStorage mode to avoid local disk dependency.
    // If GIF generation is required, req.file.buffer would need to be written to os.tmpdir() first.

    res.json({
      id: mediaId,
      url: uploadResult.url,
      type: fileType,
      stored_filename: s3Key,
      previewGifUrl,
      previewGifId,
    });
  }),
];

const saveTemplate = asyncHandler(async (req, res) => {
  const id = await proposalBuilderService.createTemplate(req.body || {}, req.userId ?? null);
  res.status(201).json({ id });
});

const saveLeadProposal = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.userId;
  const data = { 
    ...req.body, 
    createdBy: req.body.createdBy || userId,
    modifiedBy: req.body.modifiedBy || userId 
  };
  const proposal = await leadProposalService.saveLeadProposal(data, req.file);
  res.json(proposal);
});

const listLeadProposals = asyncHandler(async (req, res) => {
  const proposals = await leadProposalService.getLeadProposals(req.params.leadId);
  res.json(proposals);
});

const deleteLeadProposal = asyncHandler(async (req, res) => {
  await leadProposalService.deleteLeadProposal(req.params.id);
  res.json({ ok: true });
});

module.exports = {
  listTemplates,
  getTemplate,
  saveTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  uploadMedia,
  saveLeadProposal,
  listLeadProposals,
  deleteLeadProposal,
  upload,
};

