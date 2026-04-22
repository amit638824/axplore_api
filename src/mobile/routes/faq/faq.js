const express = require("express");
const router = express.Router();
const controller = require("../../controllers/faq/faq.controller.js");
const { paxAuth } = require("../../middleware/paxAuth.js");


// PROFILE
router.get("/get", paxAuth, controller.faq);

module.exports = router;