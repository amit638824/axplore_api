const express = require("express");
const router = express.Router();
const controller = require("../../controllers/sos/sos.controller");
const { paxAuth } = require("../../middleware/paxAuth");
const { validate } = require("../../../middleware/validation");
const { triggerSosSchema } = require("../../validators/sos.validator");

// SOS master list
router.get("/master-list", paxAuth, controller.getMasterList);

// SOS trigger should ideally be protected by paxAuth
router.post("/trigger", paxAuth, validate(triggerSosSchema), controller.triggerSos);

module.exports = router;
