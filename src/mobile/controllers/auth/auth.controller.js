const service = require("../../services/mobileapp/auth.service.js");
const authService = service; // reuse
const { success } = require("../../../utils/response.js");
const { asyncHandler } = require("../../../middleware/errorHandler.js");
const { maskMobile } = require("../../utils/mask.util.js");

exports.sendOtp = asyncHandler(async (req, res) => {
  const { countryCode, mobile, deviceId } = req.body;

  if (!countryCode || !mobile || !deviceId) {
    throw new Error("countryCode, mobile and deviceId are required");
  }

  const data = await service.login(countryCode, mobile, deviceId);
  const maskedMobile = maskMobile(mobile);

  return success(
    res,
    data,
    `OTP has been sent to ${countryCode} ${maskedMobile}`
  );
});

//  Verify OTP (Login)
exports.verifyOtp = asyncHandler(async (req, res) => {
  const {
    countryCode,
    mobile,
    otp,
    deviceId,
    deviceType,
    deviceName,
    fcmtoken,
    Nationality,
    location,
  } = req.body;

  if (!countryCode || !mobile || !otp || !deviceId) {
    throw new Error("Missing required fields");
  }

  const result = await service.verifyOtp({
    countryCode,
    mobile,
    otp,
    deviceId,
    deviceType,
    deviceName,
    fcmtoken,
    Nationality,
    location,
  });

  return success(res, result, "Login successful");
});
exports.firebaseLogin = asyncHandler(async (req, res) => {
  const { idToken, deviceId, deviceName, deviceType, fcmtoken } = req.body;

  if (!idToken || !deviceId) {
    throw { message: "idToken and deviceId required", statusCode: 400 };
  }

  const result = await service.firebaseLogin({
    idToken,
    deviceId,
    deviceName,
    deviceType,
    fcmtoken,
  });

  return success(res, result, "Login successful");
});

exports.login = asyncHandler(async (req, res) => {
  const data = await service.passwordLogin(req.body);
  return success(res, data, "User logged in successfully");
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken, deviceId } = req.body;
  const data = await service.refreshToken(refreshToken, deviceId);
  // return success(res, data);
  return success(res, data, `refresh token created`);
});
exports.verifyResetOtp = asyncHandler(async (req, res) => {
  const { mobile, countryCode, otp } = req.body;

  const data = await service.verifyResetOtp({ mobile, countryCode, otp });

  return success(res, data, "OTP verified");
});
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { mobile, countryCode } = req.body;
  const maskedMobile = maskMobile(mobile);

  const data = await service.forgotPassword(mobile, countryCode);
  // return success(res, data);
  return success(
    res,
    data,
    `OTP has been sent to ${countryCode} ${maskedMobile}`
  );
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { idToken, newPassword } = req.body;

  await service.resetPassword({ idToken, newPassword });

  return success(
    res,
    null,
    "Password changed successfully. You can now log in with your new password."
  );
});
exports.resetPasswordfirebase = asyncHandler(async (req, res) => {
  const { idToken, newPassword } = req.body;

  const result = await service.resetPasswordWithFirebase({
    idToken,
    newPassword,
  });

  return success(res, result, "Password reset successful");
});
//  Logout (Single Device)
exports.logout = asyncHandler(async (req, res) => {
  await service.logout(req.user.pax_id, req.device.device_token);

  return success(res, null, "Logged out successfully");
});

//  Logout All Devices
exports.logoutAll = asyncHandler(async (req, res) => {
  await service.logoutAll(req.user.pax_id);

  return success(res, null, "Logged out from all devices");
});
exports.enrollFace = asyncHandler(async (req, res) => {
  const result = await service.enrollFace(
    {
      ...req.body,
      faceImageFile: req.file,
    },
    req.user
  );

  return success(res, result, "Face enrolled successfully");
});

exports.faceLogin = asyncHandler(async (req, res) => {
  const result = await service.faceLogin({
    ...req.body,
    faceImageFile: req.file,
  });

  return success(res, result, "Face login successful");
});


exports.getFaceStatus = asyncHandler(async (req, res) => {
  const result = await service.getFaceStatus(req.user);

  return success(res, result, "Face status fetched successfully");
});

exports.removeFace = asyncHandler(async (req, res) => {
  const result = await service.removeFace(req.user);

  return success(res, result, "Face removed successfully");
});

exports.registration = asyncHandler(async (req, res) => {
  const data = await service.registerUser(req.body);
  return res.status(201).json({
    success: true,
    statusCode: 201,
    message: "User registered successfully",
    data
  });
});

exports.verifyMobile = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;
  const result = await service.verifyMobileNumber(mobileNumber);

  if (result.alreadyRegistered) {
    return res.status(409).json({
      success: false,
      statusCode: 409,
      message: "Mobile number is already registered",
      data: result
    });
  }

  return res.status(200).json({
    success: true,
    statusCode: 200,
    message: "OTP sent successfully to mobile number",
    data: result
  });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const { emailAddress } = req.body;
  const result = await service.verifyEmailAddress(emailAddress);

  if (result.alreadyRegistered) {
    return res.status(409).json({
      success: false,
      statusCode: 409,
      message: "Email address is already registered",
      data: result
    });
  }

  return res.status(200).json({
    success: true,
    statusCode: 200,
    message: "OTP sent successfully to email address",
    data: result
  });
});

exports.verifyMobileOtp = asyncHandler(async (req, res) => {
  const result = await service.verifyMobileOtp(req.body);

  return res.status(200).json({
    success: true,
    statusCode: 200,
    message: "OTP verified successfully",
    data: result
  });
});

exports.verifyEmailOtp = asyncHandler(async (req, res) => {
  const result = await service.verifyEmailOtp(req.body);

  return res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Email OTP verified successfully",
    data: result
  });
});