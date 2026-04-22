const service = require("../../../mobile/services/mobileapp/user.service");
const { asyncHandler } = require("../../../middleware/errorHandler");
const { success, paginated } = require("../../../utils/response");
const { uploadToS3 } = require("../../utils/s3Upload");
const { prisma } = require("../../../config/database");

// PROFILE
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await service.getProfile(req.user.pax_id);
  return success(res, user);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const updated = await service.updateProfile(req.user.pax_id, req.body);
  return success(res, updated, "Profile updated successfully");
});

exports.uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new Error("No file uploaded");

  // const fileUrl = await uploadToS3(
  //   req.file,
  //   "client/axplore/profile/"
  // );
  const agencyId = "bb93d353-9313-46c6-8e5d-71b9471b6691";
  const agencySettings = await prisma.travelAgencySettings.findFirst({
  where: {
    travelAgencyId: agencyId,
    isActive: true,
  },
});

const fileUrl = await uploadToS3(
  req.file,
  agencySettings,
  "client/axplore/profile/"
);

  const updated = await service.updateProfilePhoto(
    req.user.pax_id,
    fileUrl
  );

  return success(res, updated, "Profile photo updated");
});

// DEVICES
exports.getDevices = asyncHandler(async (req, res) => {
  const devices = await service.getDevices(
    req.user.pax_id,
    req.device.device_token
  );
  return success(res, devices);
});

// PASSWORD
exports.changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new Error("Old password and new password are required");
  }

  await service.changePassword(req.user.pax_id, oldPassword, newPassword);

  return success(
    res,
    null,
    "Password updated successfully. You have been logged out from all devices. Please log in again."
  );
});

// EMERGENCY CONTACTS
exports.addEmergencyContact = asyncHandler(async (req, res) => {
  const data = await service.addEmergencyContact(req.user.pax_id, req.body);
  return success(res, data, "Contact added");
});

exports.getEmergencyContacts = asyncHandler(async (req, res) => {
  const result = await service.getEmergencyContacts(req.user.pax_id, req.query);

  return paginated(res, result.data, result.pagination);
});

exports.updateEmergencyContact = asyncHandler(async (req, res) => {
  const data = await service.updateEmergencyContact(
    req.user.pax_id,
    req.params.id,
    req.body
  );
  return success(res, data, "Contact updated");
});

exports.deleteEmergencyContact = asyncHandler(async (req, res) => {
  const data = await service.deleteEmergencyContact(
    req.user.pax_id,
    req.params.id
  );
  return success(res, data, "Contact deleted");
});

// SOS
exports.sosAlert = asyncHandler(async (req, res) => {
  const data = await service.sos(req.user.pax_id, req.body);
  return success(res, data, "SOS triggered");
});
