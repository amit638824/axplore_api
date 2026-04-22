/**
 * Proposal / Template Builder Routes
 * Namespaced under /api/proposal
 */

const express = require("express");
const path = require("path");
const expressStatic = require("express").static;
const { authenticate } = require("../middleware/auth");
const proposalController = require("../controllers/proposalBuilder.controller");
const proposalService = require("../services/proposalBuilder.service");
const upload = require("../utils/multerConfig");

const router = express.Router();

// Serve uploaded files (local storage implementation) - public access
router.use(
  "/uploads",
  expressStatic(proposalService.getUploadsRoot(), {
    fallthrough: false,
    setHeaders: (res) => {
      // Prevent caching of frequently replaced assets during editing
      res.setHeader("Cache-Control", "no-store");
    },
  }),
);

// All routes require authentication
router.use(authenticate);

// Proposal Template routes
router.get('/templates', proposalController.listTemplates);
router.post('/templates', proposalController.saveTemplate);
router.get('/templates/:id', proposalController.getTemplate);
router.put('/templates/:id', proposalController.updateTemplate);
router.delete('/templates/:id', proposalController.deleteTemplate);
router.post('/templates/:id/duplicate', proposalController.duplicateTemplate);

// Lead Proposal CRUD
router.post("/lead-proposals", proposalController.upload.single('file'), proposalController.saveLeadProposal);
router.get("/lead-proposals/:leadId", proposalController.listLeadProposals);
router.delete("/lead-proposals/:id", proposalController.deleteLeadProposal);

// Media upload + optional GIF preview
router.post("/media/upload", ...proposalController.uploadMedia);

// Dummy endpoints (used by builder's API-variable testing)
router.get("/dummy/registration", (req, res) => {
  res.json({
    organizationName: "HashtagLabs",
    email: "demo@example.com",
    registrationNumber: "ARW0522YB71",
    paymentStatus: "Pending",
    registrationDateTime: new Date().toISOString(),
    username: "demo_user",
    documentUrl: null,
  });
});

router.get("/dummy/list", (req, res) => {
  res.json({
    project_name: "Project Name",
    project_id: "1234567890",
    users: [
      { name: "John Doe", email: "john@example.com", role: "Admin" },
      { name: "Jane Smith", email: "jane@example.com", role: "Member" },
      { name: "Bob Wilson", email: "bob@example.com", role: "Member" },
    ],
    destinations: [
      { name: "Dubai" },
      { name: "Singapore" },
      { name: "Maldives" },
    ],
  });
});

router.post("/dummy/payload", (req, res) => {
  const body = req.body || {};
  const now = new Date().toISOString();
  const base = { received: body, id: body.id ?? 101, createdAt: now };
  if (body.userName != null || body.email != null) {
    Object.assign(base, {
      userName: body.userName ?? "John Doe",
      userEmail: body.userEmail ?? body.email ?? "user@example.com",
      status: body.status ?? "Active",
      role: body.role ?? "Member",
      displayName: body.displayName ?? (body.userName || "User"),
    });
  }
  if (body.orderId != null || body.amount != null) {
    const amt = Number(body.amount) || 0;
    Object.assign(base, {
      orderId: body.orderId ?? "ORD-001",
      amount: body.amount ?? 0,
      total: amt + (Number(body.tax) || 0),
      orderStatus: body.orderStatus ?? "Confirmed",
      currency: body.currency ?? "USD",
    });
  }
  if (body.productId != null || body.productName != null) {
    Object.assign(base, {
      productId: body.productId ?? "P001",
      productName: body.productName ?? "Sample Product",
      price: body.price ?? 0,
      quantity: body.quantity ?? 1,
      sku: body.sku ?? "SKU-001",
    });
  }
  if (!body.userName && !body.orderId && !body.productId) {
    Object.assign(base, {
      message: "Success",
      code: body.code ?? 200,
      ref: body.ref ?? `REF-${Date.now().toString(36)}`,
    });
  }
  res.json(base);
});

module.exports = router;

