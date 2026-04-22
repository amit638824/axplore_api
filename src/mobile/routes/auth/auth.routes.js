const express = require("express");
const router = express.Router();
const controller = require("../../controllers/auth/auth.controller.js");
const { paxAuth } = require("../../middleware/paxAuth.js");
const upload = require("../../middleware/upload.js");
const { validate } = require("../../../middleware/validation");
const { registrationSchema, mobileVerificationSchema, emailVerificationSchema, otpVerificationSchema, loginSchema } = require("../../validators/auth.validator");

// ================= PUBLIC =================
router.post("/verify-mobile", validate(mobileVerificationSchema), controller.verifyMobile);
router.post("/verify-email", validate(emailVerificationSchema), controller.verifyEmail);
router.post("/verify-otp-mobile", validate(otpVerificationSchema), controller.verifyMobileOtp);
router.post("/verify-otp-email", validate(otpVerificationSchema), controller.verifyEmailOtp);
router.post("/send-otp", controller.sendOtp);
router.post("/verify-otp", controller.verifyOtp);
router.post("/registration", validate(registrationSchema), controller.registration);
router.post("/login", validate(loginSchema), controller.login);
router.post("/firebase-login", controller.firebaseLogin);
router.post("/refresh-token", controller.refreshToken);
router.post("/forget-password", controller.forgotPassword)
router.post("/verify-reset-otp",controller.verifyResetOtp)
router.post("/reset-password", controller.resetPassword)
router.post("/logout", paxAuth, controller.logout);
router.post("/logout-all", paxAuth, controller.logoutAll);

router.post(
  "/face/enroll",
  paxAuth,
  upload.single("faceImage"),
  controller.enrollFace
);

router.post(
  "/face/login",
  upload.single("faceImage"),
  controller.faceLogin
);

router.post(
  "/face/remove",
  paxAuth,
  controller.removeFace
);

router.get(
  "/face/status",
  paxAuth,
  controller.getFaceStatus
);
module.exports = router;