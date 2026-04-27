const express = require("express");
const router = express.Router();
const controller = require("../../controllers/user/user.controller.js");
const dependentController = require("../../controllers/user/dependent.controller.js");

const { paxAuth } = require("../../middleware/paxAuth.js");
const upload = require("../../middleware/upload.js");


// PROFILE
router.get("/me", paxAuth, controller.getProfile);
router.patch("/profile", paxAuth, controller.updateProfile);
router.patch(
  "/profile-photo",
  paxAuth,
  upload.single("photo"),
  controller.uploadProfilePhoto
);

// DEVICES
router.get("/devices", paxAuth, controller.getDevices);

// PASSWORD
router.post("/change-password", paxAuth, controller.changePassword);

// EMERGENCY CONTACTS
router.post("/emergency-contacts", paxAuth, controller.addEmergencyContact);
router.get("/emergency-contacts", paxAuth, controller.getEmergencyContacts);
router.patch("/emergency-contacts/:id", paxAuth, controller.updateEmergencyContact);
router.delete("/emergency-contacts/:id", paxAuth, controller.deleteEmergencyContact);

// SOS
router.post("/sos", paxAuth, controller.sosAlert);

// FAMILY MEMBERS
router.post("/family-members", paxAuth, dependentController.addFamilyDetails);


module.exports = router;