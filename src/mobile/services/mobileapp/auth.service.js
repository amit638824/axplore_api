const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { prisma } = require("../../../config/database");
const otpStore = new Map();
const crypto = require("crypto");
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
const generateToken = (paxId, deviceId) => {
  return jwt.sign({ paxId, deviceId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};
const { compareFaces } = require("../../utils/faceCompare");

const { uploadToS3, deleteFromS3 } = require("../../utils/s3Upload");


const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      require("../../../config/firebase-service-account.json")
    ),
  });
}
const handleUserDeviceLogin = async (
  tx,
  {
    mobile,
    countryCode,
    deviceId,
    deviceName,
    deviceType,
    firebase_uid,
    refreshToken,
    refreshExpiry,
  }
) => {
  const hashedRefreshToken = hashToken(refreshToken);

  const user = await tx.pax.upsert({
    where: {
      mobile_no_current_country_code: {
        mobile_no: mobile,
        current_country_code: countryCode,
      },
    },
    update: {
      is_verified: true,
      modified_at: new Date(),
      firebase_uid,
    },
    create: {
      mobile_no: mobile,
      current_country_code: countryCode,
      firebase_uid,
      is_verified: true,
      is_guest: false,
      status: "ACTIVE",
      first_name: "User",
    },
  });

  await tx.auth_user.upsert({
    where: { pax_id: user.pax_id },
    update: {
      is_mobile_verified: true,
      last_login_at: new Date(),
    },
    create: {
      login_mobile_no: mobile,
      is_mobile_verified: true,
      status: "ACTIVE",
      pax: { connect: { pax_id: user.pax_id } },
    },
  });

  await tx.pax_device.upsert({
    where: { device_token: deviceId },
    update: {
      pax_id: user.pax_id,
      device_name: deviceName,
      device_type: deviceType,
      firebase_uid,
      refresh_token: hashedRefreshToken,
      refresh_token_expiry: refreshExpiry,
      is_active: true,
      last_login_at: new Date(),
      modified_at: new Date(),
    },
    create: {
      pax_id: user.pax_id,
      device_token: deviceId,
      device_name: deviceName,
      device_type: deviceType,
      firebase_uid,
      refresh_token: hashedRefreshToken,
      refresh_token_expiry: refreshExpiry,
      is_active: true,
      last_login_at: new Date(),
    },
  });

  return user;
};

// ================= LOGIN (SEND OTP) =================
exports.login = async (countryCode, mobile, deviceId) => {
  const key = `${countryCode}_${mobile}`;
  const existing = otpStore.get(key);

  // ⛔ RESEND LIMIT (1 min)
  if (existing && existing.resendAt > Date.now()) {
    const error = new Error("Please wait before requesting new OTP");
    error.statusCode = 429;
    throw error;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // ❗ overwrite old OTP (invalidate previous)
  otpStore.set(key, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
    resendAt: Date.now() + 30 * 1000, // 1 min resend lock
  });

  console.log("OTP:", otp); // send via SMS

  return {
    otp: otp,
  };
};

//  TOKEN GENERATORS
const generateAccessToken = (paxId, deviceId) => {
  return jwt.sign({ paxId, deviceId }, process.env.JWT_SECRET, {
    expiresIn: "10h", // ✅ 10 hour
  });
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

exports.verifyOtpold = async (data) => {
  const {
    countryCode,
    mobile,
    otp,
    deviceId,
    deviceName,
    deviceType,
    fcmtoken,
    Nationality,
    location,
  } = data;

  // ================= OTP VALIDATION =================
  const key = `${countryCode}_${mobile}`;
  const stored = otpStore.get(key);

  if (!stored) {
    throw { message: "OTP not found", statusCode: 400 };
  }

  if (stored.expiresAt < Date.now()) {
    otpStore.delete(key);
    throw { message: "OTP expired", statusCode: 400 };
  }

  if (stored.otp !== otp) {
    throw { message: "Invalid OTP", statusCode: 400 };
  }

  otpStore.delete(key);

  // ================= TOKENS =================
  const refreshToken = generateRefreshToken();
  const hashedRefreshToken = hashToken(refreshToken);

  const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // ================= TRANSACTION =================
  const user = await prisma.$transaction(async (tx) => {
    // ================= USER (UPSERT - SAFE) =================
    const user = await prisma.$transaction(async (tx) => {
      let user;

      try {
        user = await tx.pax.upsert({
          where: {
            mobile_no_current_country_code: {
              mobile_no: mobile,
              current_country_code: countryCode,
            },
          },
          update: {
            is_verified: true,
            modified_at: new Date(),
          },
          create: {
            mobile_no: mobile,
            current_country_code: countryCode,
            is_verified: true,
            is_guest: false,
            status: "ACTIVE",
            first_name: "User",
            nationality_code: Nationality,
          },
        });
      } catch (error) {
        console.log("PAX UPSERT ERROR:", error);
        console.log("CODE:", error.code);
        console.log("META:", error.meta);
        throw error;
      }

      await tx.auth_user.upsert({
        where: { pax_id: user.pax_id },
        update: {
          is_mobile_verified: true,
          last_login_at: new Date(),
        },
        create: {
          login_mobile_no: mobile,
          is_mobile_verified: true,
          status: "ACTIVE",
          pax: {
            connect: { pax_id: user.pax_id },
          },
        },
      });

      await tx.pax_device.upsert({
        where: {
          device_token: deviceId,
        },
        update: {
          pax_id: user.pax_id,
          device_name: deviceName,
          device_type: deviceType,
          firebase_uid: fcmtoken,
          refresh_token: hashedRefreshToken,
          refresh_token_expiry: refreshExpiry,
          last_token_refresh_at: new Date(),
          is_active: true,
          last_login_at: new Date(),
          country: countryCode,
          city: location,
          modified_at: new Date(),
        },
        create: {
          pax_id: user.pax_id,
          device_token: deviceId,
          device_name: deviceName,
          device_type: deviceType,
          firebase_uid: fcmtoken,
          refresh_token: hashedRefreshToken,
          refresh_token_expiry: refreshExpiry,
          last_token_refresh_at: new Date(),
          is_active: true,
          last_login_at: new Date(),
        },
      });

      return user;
    });

    // ================= AUTH USER =================
    await tx.auth_user.upsert({
      where: { pax_id: user.pax_id },
      update: {
        is_mobile_verified: true,
        last_login_at: new Date(),
      },
      create: {
        login_mobile_no: mobile,
        is_mobile_verified: true,
        status: "ACTIVE",
        pax: {
          connect: { pax_id: user.pax_id },
        },
      },
    });

    // ================= DEVICE UPSERT =================
    await tx.pax_device.upsert({
      where: {
        device_token: deviceId, // unique
      },
      update: {
        pax_id: user.pax_id,
        device_name: deviceName,
        device_type: deviceType,
        firebase_uid: fcmtoken,
        refresh_token: hashedRefreshToken,
        refresh_token_expiry: refreshExpiry,
        last_token_refresh_at: new Date(),
        is_active: true,
        last_login_at: new Date(),
        modified_at: new Date(),
      },
      create: {
        pax_id: user.pax_id,
        device_token: deviceId,
        device_name: deviceName,
        device_type: deviceType,
        firebase_uid: fcmtoken,
        refresh_token: hashedRefreshToken,
        refresh_token_expiry: refreshExpiry,
        last_token_refresh_at: new Date(),
        is_active: true,
        last_login_at: new Date(),
      },
    });

    return user;
  });

  // ================= ACCESS TOKEN =================
  const accessToken = generateAccessToken(user.pax_id, deviceId);

  return {
    accessToken,
    refreshToken, // return RAW token (only stored hashed)
    user,
  };
};
exports.verifyOtp = async (data) => {
  const {
    countryCode,
    mobile,
    otp,
    deviceId,
    deviceName,
    deviceType,
    fcmtoken,
    Nationality,
    location,
  } = data;

  // ================= OTP VALIDATION =================
  const key = `${countryCode}_${mobile}`;
  const stored = otpStore.get(key);

  if (!stored) {
    throw { message: "OTP not found", statusCode: 400 };
  }

  if (stored.expiresAt < Date.now()) {
    otpStore.delete(key);
    throw { message: "OTP expired", statusCode: 400 };
  }

  if (stored.otp !== otp) {
    throw { message: "Invalid OTP", statusCode: 400 };
  }

  otpStore.delete(key);

  // ================= TOKENS =================
  const refreshToken = generateRefreshToken();
  const hashedRefreshToken = hashToken(refreshToken);
  const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // ================= TRANSACTION =================
  const user = await prisma.$transaction(async (tx) => {
    let user;

    // ================= USER UPSERT =================
    try {
      user = await tx.pax.upsert({
        where: {
          mobile_no_current_country_code: {
            mobile_no: mobile,
            current_country_code: countryCode,
          },
        },
        update: {
          is_verified: true,
          modified_at: new Date(),
          nationality_code: Nationality || undefined,
        },
        create: {
          mobile_no: mobile,
          current_country_code: countryCode,
          is_verified: true,
          is_guest: false,
          status: "ACTIVE",
          first_name: "User",
          nationality_code: Nationality,
        },
      });
    } catch (error) {
      console.log("PAX UPSERT ERROR:", error);
      console.log("CODE:", error.code);
      console.log("META:", error.meta);
      throw error;
    }

    // ================= AUTH USER UPSERT =================
    const existingAuthUser = await tx.auth_user.findFirst({
      where: {
        OR: [
          { pax_id: user.pax_id },
          { login_mobile_no: mobile },
        ],
      },
    });

    if (existingAuthUser) {
      await tx.auth_user.update({
        where: {
          auth_user_id: existingAuthUser.auth_user_id,
        },
        data: {
          pax_id: user.pax_id,
          login_mobile_no: mobile,
          is_mobile_verified: true,
          status: "ACTIVE",
          last_login_at: new Date(),
          modified_at: new Date(),
        },
      });
    } else {
      await tx.auth_user.create({
        data: {
          pax_id: user.pax_id,
          login_mobile_no: mobile,
          is_mobile_verified: true,
          status: "ACTIVE",
          last_login_at: new Date(),
        },
      });
    }

    // ================= DEVICE UPSERT =================
    await tx.pax_device.upsert({
      where: {
        device_token: deviceId,
      },
      update: {
        pax_id: user.pax_id,
        device_name: deviceName,
        device_type: deviceType,
        firebase_uid: fcmtoken,
        refresh_token: hashedRefreshToken,
        refresh_token_expiry: refreshExpiry,
        last_token_refresh_at: new Date(),
        is_active: true,
        last_login_at: new Date(),
        country: countryCode,
        city: location,
        modified_at: new Date(),
      },
      create: {
        pax_id: user.pax_id,
        device_token: deviceId,
        device_name: deviceName,
        device_type: deviceType,
        firebase_uid: fcmtoken,
        refresh_token: hashedRefreshToken,
        refresh_token_expiry: refreshExpiry,
        last_token_refresh_at: new Date(),
        is_active: true,
        last_login_at: new Date(),
        country: countryCode,
        city: location,
      },
    });

    return user;
  });

  // ================= ACCESS TOKEN =================
  const accessToken = generateAccessToken(user.pax_id, deviceId);

  return {
    accessToken,
    refreshToken,
    user,
  };
};
exports.firebaseLogin = async (data) => {
  const { idToken, deviceId, deviceName, deviceType } = data;

  if (!idToken || !deviceId) {
    throw { message: "idToken and deviceId required", statusCode: 400 };
  }

  const decoded = await admin.auth().verifyIdToken(idToken);

  if (!decoded.phone_number) {
    throw { message: "Invalid Firebase token", statusCode: 401 };
  }

  const fullMobile = decoded.phone_number;
  const countryCode = fullMobile.slice(0, 3);
  const mobile = fullMobile.slice(3);

  const refreshToken = generateRefreshToken();
  const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const user = await prisma.$transaction((tx) =>
    handleUserDeviceLogin(tx, {
      mobile,
      countryCode,
      deviceId,
      deviceName,
      deviceType,
      firebase_uid: decoded.uid,
      refreshToken,
      refreshExpiry,
    })
  );

  const accessToken = generateAccessToken(user.pax_id, deviceId);

  return {
    success: true,
    statusCode: 200,
    message: "Login successful",
    data: {
      accessToken,
      refreshToken,
      user,
    },
  };
};
exports.passwordLogin = async (data) => {
  const {
    mobile,
    countryCode,
    password,
    deviceId,
    deviceName,
    deviceType,
    fcmtoken,
  } = data;

  if (!mobile || !password || !deviceId) {
    throw {
      message: "mobile, password and deviceId required",
      statusCode: 400,
    };
  }

  // ================= USER =================
  const user = await prisma.pax.findFirst({
    where: {
      mobile_no: mobile,
      current_country_code: countryCode,
    },
  });

  if (!user) {
    throw { message: "User not found", statusCode: 404 };
  }

  if (user.status !== "ACTIVE") {
    throw { message: "User inactive", statusCode: 403 };
  }

  // ================= AUTH =================
  const auth = await prisma.auth_user.findUnique({
    where: { pax_id: user.pax_id },
  });

  if (!auth || !auth.password_hash) {
    throw { message: "Password not set", statusCode: 400 };
  }

  const isMatch = await bcrypt.compare(password, auth.password_hash);
  if (!isMatch) {
    throw { message: "Invalid password", statusCode: 401 };
  }

  // ================= TOKENS =================
  const accessToken = generateAccessToken(user.pax_id, deviceId);

  const refreshToken = generateRefreshToken();
  const hashedRefreshToken = hashToken(refreshToken);

  const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // ================= DEVICE UPSERT =================
  await prisma.pax_device.upsert({
    where: {
      device_token: deviceId,
    },
    update: {
      pax_id: user.pax_id,
      device_name: deviceName,
      device_type: deviceType,
      firebase_uid: fcmtoken,
      refresh_token: hashedRefreshToken,
      refresh_token_expiry: refreshExpiry,
      last_token_refresh_at: new Date(),
      is_active: true,
      last_login_at: new Date(),
      modified_at: new Date(),
    },
    create: {
      pax_id: user.pax_id,
      device_token: deviceId,
      device_name: deviceName,
      device_type: deviceType,
      firebase_uid: fcmtoken,
      refresh_token: hashedRefreshToken,
      refresh_token_expiry: refreshExpiry,
      last_token_refresh_at: new Date(),
      is_active: true,
      last_login_at: new Date(),
    },
  });

  return {
    accessToken,
    refreshToken, // send raw token
    user,
  };
};

exports.refreshToken = async (refreshToken, deviceId) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  const device = await prisma.pax_device.findFirst({
    where: {
      device_token: deviceId,
      refresh_token: hashedToken,
      is_active: true,
    },
  });

  if (!device) {
    throw { message: "Invalid refresh token", statusCode: 401 };
  }
  if (
    !device.refresh_token_expiry ||
    device.refresh_token_expiry < new Date()
  ) {
    throw { message: "Invalid refresh token", statusCode: 401 };
  }

  const newRefreshToken = crypto.randomBytes(64).toString("hex");

  const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.pax_device.update({
    where: { pax_device_id: device.pax_device_id },
    data: {
      refresh_token: crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex"),
      refresh_token_expiry: newExpiry,
      last_token_refresh_at: new Date(),
    },
  });

  const accessToken = jwt.sign(
    { paxId: device.pax_id, deviceId },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};
exports.forgotPassword = async (mobile, countryCode) => {
  const user = await prisma.pax.findFirst({
    where: {
      mobile_no: mobile,
      current_country_code: countryCode,
    },
  });

  if (!user) {
    throw { message: "User not found", statusCode: 404 };
  }

  //  Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `${countryCode}_${mobile}`;

  otpStore.set(key, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
  });
  return {
    otp: otp,
  };
};

exports.verifyResetOtp = async ({ mobile, countryCode, otp }) => {
  const key = `${countryCode}_${mobile}`;
  const stored = otpStore.get(key);

  if (!stored) throw { message: "OTP not found", statusCode: 400 };
  if (stored.expiresAt < Date.now()) {
    otpStore.delete(key);
    throw { message: "OTP expired", statusCode: 400 };
  }
  if (stored.otp !== otp) {
    throw { message: "Invalid OTP", statusCode: 400 };
  }

  otpStore.delete(key);

  const resetToken = jwt.sign(
    { mobile, countryCode, type: "RESET_PASSWORD" },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  return { resetToken };
};

exports.resetPassword = async ({ idToken, newPassword }) => {
  if (!idToken || !newPassword) {
    throw { message: "Token and new password required", statusCode: 400 };
  }

  if (newPassword.length < 6) {
    throw { message: "Password too weak", statusCode: 400 };
  }

  let decoded;

  try {
    decoded = jwt.verify(idToken, process.env.JWT_SECRET);
  } catch (err) {
    throw { message: "Invalid or expired token", statusCode: 401 };
  }

  // 🔒 Ensure correct token type
  if (decoded.type !== "RESET_PASSWORD") {
    throw { message: "Invalid token type", statusCode: 400 };
  }

  const { mobile, countryCode, iat } = decoded;

  // 🔍 Find user
  const user = await prisma.pax.findFirst({
    where: {
      mobile_no: mobile,
      current_country_code: countryCode,
    },
  });

  if (!user) {
    throw { message: "User not found", statusCode: 404 };
  }

  // 🔍 Get auth record
  const auth = await prisma.auth_user.findUnique({
    where: { pax_id: user.pax_id },
  });

  // 🔴 Prevent token reuse (IMPORTANT)
  if (
    auth.last_password_changed_at &&
    iat * 1000 < auth.last_password_changed_at.getTime()
  ) {
    throw { message: "Token already used or expired", statusCode: 400 };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction(async (tx) => {
    // ✅ Update password
    await tx.auth_user.update({
      where: { pax_id: user.pax_id },
      data: {
        password_hash: hashedPassword,
        last_password_changed_at: new Date(), // 🔥 key for invalidation
      },
    });

    // ✅ Logout all devices
    await tx.pax_device.updateMany({
      where: { pax_id: user.pax_id },
      data: {
        is_active: false,
        refresh_token: null,
      },
    });
  });

  return { message: "Password reset successful" };
};
exports.resetPasswordWithFirebase = async ({ idToken, newPassword }) => {
  if (!idToken || !newPassword) {
    throw { message: "idToken and newPassword required", statusCode: 400 };
  }

  // ✅ Verify Firebase token
  const decoded = await admin.auth().verifyIdToken(idToken);

  const mobile = decoded.phone_number; // format: +91XXXXXXXXXX

  if (!mobile) {
    throw { message: "Phone number not found in token", statusCode: 400 };
  }

  // split country code & mobile
  const countryCode = mobile.slice(0, 3); // +91
  const mobileNo = mobile.slice(3);

  // find user
  const user = await prisma.pax.findFirst({
    where: {
      mobile_no: mobileNo,
      current_country_code: countryCode,
    },
  });

  if (!user) {
    throw { message: "User not found", statusCode: 404 };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.auth_user.update({
      where: { pax_id: user.pax_id },
      data: {
        password_hash: hashedPassword,
        last_password_changed_at: new Date(),
      },
    });

    await tx.pax_device.updateMany({
      where: { pax_id: user.pax_id },
      data: {
        is_active: false,
        refresh_token: null,
      },
    });
  });

  return { message: "Password reset successful" };
};

exports.logout = async (paxId, deviceToken) => {
  const result = await prisma.pax_device.updateMany({
    where: {
      pax_id: paxId,
      device_token: deviceToken,
      is_active: true,
    },
    data: {
      is_active: false,
      refresh_token: null,
      refresh_token_expiry: null,
      modified_at: new Date(),
    },
  });

  return result;
};
exports.logoutAll = async (paxId) => {
  const result = await prisma.pax_device.updateMany({
    where: {
      pax_id: paxId,
      is_active: true,
    },
    data: {
      is_active: false,
      refresh_token: null,
      refresh_token_expiry: null,
      modified_at: new Date(),
    },
  });

  return result;
};
// ================= FACE ENROLL =================

exports.enrollFace = async (data, currentUser) => {
  const { faceImageFile } = data;

  if (!faceImageFile) {
    throw {
      message: "face image is required",
      statusCode: 400,
    };
  }
  const paxId = currentUser.pax_id;
  console.log("Current User:", paxId);

  if (!paxId) {
    throw {
      message: "Unauthorized user",
      statusCode: 401,
    };
  }


  const paxUser = await prisma.pax.findUnique({
    where: {
      pax_id: paxId,
    },
  });
  if (!paxUser) {
    throw {
      message: "User not found",
      statusCode: 404,
    };
  }

  const authUser = await prisma.auth_user.findUnique({
    where: {
      pax_id: paxUser.pax_id,
    },
  });

  if (!authUser) {
    throw {
      message: "Auth user not found",
      statusCode: 404,
    };
  }

  // upload image to S3
  // const faceImageUrl = await uploadToS3(faceImageFile, "client/axplore/face/");
const agencyId = "bb93d353-9313-46c6-8e5d-71b9471b6691";

  const agencySettings = await prisma.travelAgencySettings.findFirst({
    where: {
      travelAgencyId: agencyId,
      isActive: true,
    },
  });

  const faceImageUrl = await uploadToS3(
    faceImageFile,
    agencySettings,
    "client/axplore/face/"
  );

  // generate internal template ref
  const faceTemplateRef = `FACE_${Date.now()}`;
  const faceProvider = "custom";

  const existingFace = await prisma.auth_face_profile.findUnique({
    where: {
      auth_user_id: authUser.auth_user_id,
    },
  });

  let faceProfile;

  if (existingFace) {
    faceProfile = await prisma.auth_face_profile.update({
      where: {
        auth_user_id: authUser.auth_user_id,
      },
      data: {
        face_provider: faceProvider,
        face_template_ref: faceTemplateRef,
        face_image_url: faceImageUrl,
        is_active: true,
        modified_at: new Date(),
      },
    });
  } else {
    faceProfile = await prisma.auth_face_profile.create({
      data: {
        auth_user_id: authUser.auth_user_id,
        face_provider: faceProvider,
        face_template_ref: faceTemplateRef,
        face_image_url: faceImageUrl,
        enrolled_at: new Date(),
        is_active: true,
      },
    });
  }

  await prisma.auth_user.update({
    where: {
      auth_user_id: authUser.auth_user_id,
    },
    data: {
      is_face_enabled: true,
      modified_at: new Date(),
    },
  });

  return {
    success: true,
    message: "Face enrolled successfully",
    faceProfile,
  };
};


// ================= FACE LOGIN =================
exports.faceLogin = async (data) => {
  const {
    countryCode,
    mobile,
    faceImageFile,
    deviceId,
    deviceName,
    deviceType,
    fcmtoken,
    location,
    Nationality,
  } = data;

  if (!countryCode || !mobile) {
    throw {
      message: "countryCode and mobile are required",
      statusCode: 400,
    };
  }

  if (!faceImageFile) {
    throw {
      message: "face image is required",
      statusCode: 400,
    };
  }

  if (!deviceId) {
    throw {
      message: "deviceId is required",
      statusCode: 400,
    };
  }

  const paxUser = await prisma.pax.findFirst({
    where: {
      mobile_no: mobile,
      current_country_code: countryCode,
    },
  });

  if (!paxUser) {
    throw {
      message: "User not found",
      statusCode: 404,
    };
  }

  const authUser = await prisma.auth_user.findUnique({
    where: {
      pax_id: paxUser.pax_id,
    },
    include: {
      auth_face_profile: true,
      pax: true,
    },
  });

  if (!authUser) {
    throw {
      message: "Auth user not found",
      statusCode: 404,
    };
  }

  if (!authUser.is_face_enabled) {
    throw {
      message: "Face login is not enabled for this account",
      statusCode: 403,
    };
  }

  if (!authUser.auth_face_profile) {
    throw {
      message: "Face profile not found",
      statusCode: 404,
    };
  }

  const storedFace = authUser.auth_face_profile;
  const agencyId = "bb93d353-9313-46c6-8e5d-71b9471b6691";

  // const currentFaceImageUrl = await uploadToS3(
  //   faceImageFile,
  //   "client/axplore/face/temp/"
  // );
  const agencySettings = await prisma.travelAgencySettings.findFirst({
    where: {
      travelAgencyId: agencyId,
      isActive: true,
    },
  });

  const currentFaceImageUrl = await uploadToS3(
    faceImageFile,
    agencySettings,
    "client/axplore/face/temp/"
  );

  let similarityScore = 0;

  try {
    const comparisonResult = await compareFaces(
      storedFace.face_image_url,
      currentFaceImageUrl
    );

    similarityScore = comparisonResult.similarity || 0;

    if (!comparisonResult.matched) {
      // await deleteFromS3(currentFaceImageUrl);

      await deleteFromS3(currentFaceImageUrl, agencySettings);

      throw {
        message: `Face not recognized. Similarity: ${similarityScore.toFixed(2)}%`,
        statusCode: 401,
      };
    }

    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken);
    const refreshExpiry = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );

    await prisma.$transaction(async (tx) => {
      await tx.auth_face_profile.update({
        where: {
          auth_face_profile_id: storedFace.auth_face_profile_id,
        },
        data: {
          last_verified_at: new Date(),
          modified_at: new Date(),
        },
      });

      await tx.auth_user.update({
        where: {
          auth_user_id: authUser.auth_user_id,
        },
        data: {
          last_login_at: new Date(),
          modified_at: new Date(),
        },
      });

      await tx.pax_device.upsert({
        where: {
          device_token: deviceId,
        },
        update: {
          pax_id: authUser.pax.pax_id,
          device_name: deviceName || null,
          device_type: deviceType || null,
          firebase_uid: fcmtoken || null,
          refresh_token: hashedRefreshToken,
          refresh_token_expiry: refreshExpiry,
          last_token_refresh_at: new Date(),
          is_active: true,
          last_login_at: new Date(),
          modified_at: new Date(),
          city: location || null,
          country: Nationality || null,
        },
        create: {
          pax_id: authUser.pax.pax_id,
          device_token: deviceId,
          device_name: deviceName || null,
          device_type: deviceType || null,
          firebase_uid: fcmtoken || null,
          refresh_token: hashedRefreshToken,
          refresh_token_expiry: refreshExpiry,
          last_token_refresh_at: new Date(),
          is_active: true,
          last_login_at: new Date(),
          city: location || null,
          country: Nationality || null,
        },
      });
    });

    const accessToken = generateAccessToken(
      authUser.pax.pax_id,
      deviceId
    );

    // await deleteFromS3(currentFaceImageUrl);
          await deleteFromS3(currentFaceImageUrl, agencySettings);


    return {
      success: true,
      accessToken,
      refreshToken,
      user: authUser.pax,
      matched: true,
      similarity: similarityScore,
      faceVerifiedAt: new Date(),
    };
  } catch (error) {
    try {
      // // await deleteFromS3(currentFaceImageUrl);
      // await deleteFromS3(currentFaceImageUrl, agencySettings);

    } catch (err) {
      console.log("Failed to delete temp face image:", err.message);
    }

    throw error;
  }
};
// ================= GET FACE STATUS =================
exports.getFaceStatus = async (currentUser) => {
  const authUser = await prisma.auth_user.findUnique({
    where: {
      pax_id: currentUser.pax_id,
    },
    include: {
      auth_face_profile: true,
    },
  });

  if (!authUser) {
    throw {
      message: "User not found",
      statusCode: 404,
    };
  }

  return {
    isFaceEnabled: authUser.is_face_enabled,
    faceProfile: authUser.auth_face_profile,
  };
};

// ================= REMOVE FACE =================
exports.removeFace = async (currentUser) => {
  const authUser = await prisma.auth_user.findUnique({
    where: {
      pax_id: currentUser.pax_id,
    },
    include: {
      auth_face_profile: true,
    },
  });

  if (!authUser) {
    throw {
      message: "User not found",
      statusCode: 404,
    };
  }

  if (!authUser.auth_face_profile) {
    throw {
      message: "Face profile not found",
      statusCode: 404,
    };
  }

  const faceImageUrl = authUser.auth_face_profile.face_image_url;

  if (faceImageUrl) {
    await deleteFromS3(faceImageUrl);
  }

  await prisma.$transaction(async (tx) => {
    await tx.auth_face_profile.update({
      where: {
        auth_user_id: authUser.auth_user_id,
      },
      data: {
        is_active: false,
        face_image_url: null,
        face_template_ref: null,
        modified_at: new Date(),
      },
    });

    await tx.auth_user.update({
      where: {
        auth_user_id: authUser.auth_user_id,
      },
      data: {
        is_face_enabled: false,
        modified_at: new Date(),
      },
    });
  });

  return {
    success: true,
    message: "Face removed successfully",
  };
};
