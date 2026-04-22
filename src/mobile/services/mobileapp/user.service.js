const { prisma } = require("../../../config/database");
const bcrypt = require("bcrypt");

exports.updateProfilePhoto = async (paxId, filePath) => {
  return await prisma.pax.update({
    where: { pax_id: paxId },
    data: {
      profile_photo_url: filePath,
      modified_at: new Date(),
    },
  });
};
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidDate = (date) => {
  const d = new Date(date);
  return !isNaN(d.getTime());
};

const cleanValue = (val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string" && val.trim() === "") return undefined;
  return val;
};
exports.updateProfileold = async (paxId, data) => {
  if (data.mobile_no) {
    throw new Error("Mobile number cannot be updated");
  }

  // Email validation
  if (data.email && !isValidEmail(data.email)) {
    throw new Error("Invalid email format");
  }

  // Email uniqueness check
  if (data.email) {
    const existing = await prisma.pax.findUnique({
      where: { email: data.email },
    });

    if (existing && existing.pax_id !== paxId) {
      throw new Error("Email already in use");
    }
  }

  // Date validation
  if (data.date_of_birth && !isValidDate(data.date_of_birth)) {
    throw new Error("Invalid date_of_birth");
  }

  // Clean values first
  const firstName = cleanValue(data.first_name);
  const middleName = cleanValue(data.middle_name);
  const lastName = cleanValue(data.last_name);

  // Generate display_name
  let displayName = cleanValue(data.display_name);

  if (!displayName) {
    displayName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  // Prepare update data
  const updateData = {
    // BASIC
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    display_name: displayName || undefined,
    email: cleanValue(data.email),
    gender: cleanValue(data.gender),
    nationality_code: cleanValue(data.nationality_code),
    alternate_mobile_no: cleanValue(data.alternate_mobile_no),

    // PROFILE PHOTO (new)
    profile_photo_url: cleanValue(data.profile_photo_url),

    // DOB
    date_of_birth: data.date_of_birth
      ? new Date(data.date_of_birth)
      : undefined,

    // CURRENT ADDRESS
    current_address_line_1: cleanValue(data.current_address_line_1),
    current_address_line_2: cleanValue(data.current_address_line_2),
    current_city: cleanValue(data.current_city),
    current_state_name: cleanValue(data.current_state_name),
    current_postal_code: cleanValue(data.current_postal_code),
    current_country_code: cleanValue(data.current_country_code),

    // PERMANENT ADDRESS
    permanent_address_line_1: cleanValue(data.permanent_address_line_1),
    permanent_address_line_2: cleanValue(data.permanent_address_line_2),
    permanent_city: cleanValue(data.permanent_city),
    permanent_state_name: cleanValue(data.permanent_state_name),
    permanent_postal_code: cleanValue(data.permanent_postal_code),
    permanent_country_code: cleanValue(data.permanent_country_code),

    modified_at: new Date(),
  };

  // Remove undefined keys (important for Prisma)
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  return await prisma.pax.update({
    where: { pax_id: paxId },
    data: updateData,
  });
};
exports.updateProfile = async (paxId, data) => {
  if (data.mobile_no) {
    throw new Error("Mobile number cannot be updated");
  }

  if (data.email && !isValidEmail(data.email)) {
    throw new Error("Invalid email format");
  }

  if (data.email) {
    const existing = await prisma.pax.findUnique({
      where: { email: data.email },
    });

    if (existing && existing.pax_id !== paxId) {
      throw new Error("Email already in use");
    }
  }

  if (data.date_of_birth && !isValidDate(data.date_of_birth)) {
    throw new Error("Invalid date_of_birth");
  }

  const firstName = cleanValue(data.first_name);
  const middleName = cleanValue(data.middle_name);
  const lastName = cleanValue(data.last_name);

  let displayName = cleanValue(data.display_name);

  if (!displayName) {
    displayName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  const updateData = {
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    display_name: displayName || undefined,
    email: cleanValue(data.email),
    gender: cleanValue(data.gender),
    nationality_code: cleanValue(data.nationality_code),
    alternate_mobile_no: cleanValue(data.alternate_mobile_no),
    profile_photo_url: cleanValue(data.profile_photo_url),
    date_of_birth: data.date_of_birth
      ? new Date(data.date_of_birth)
      : undefined,

    current_address_line_1: cleanValue(data.current_address_line_1),
    current_address_line_2: cleanValue(data.current_address_line_2),
    current_city: cleanValue(data.current_city),
    current_state_name: cleanValue(data.current_state_name),
    current_postal_code: cleanValue(data.current_postal_code),
    current_country_code: cleanValue(data.current_country_code),

    permanent_address_line_1: cleanValue(data.permanent_address_line_1),
    permanent_address_line_2: cleanValue(data.permanent_address_line_2),
    permanent_city: cleanValue(data.permanent_city),
    permanent_state_name: cleanValue(data.permanent_state_name),
    permanent_postal_code: cleanValue(data.permanent_postal_code),
    permanent_country_code: cleanValue(data.permanent_country_code),

    modified_at: new Date(),
  };

  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  //  NEW: prepare auth updates
  let authUpdate = {};

  if (data.email) {
    authUpdate.login_email = data.email;
  }

  if (data.password) {
    const hash = await bcrypt.hash(data.password, 10);
    authUpdate.password_hash = hash;
    authUpdate.last_password_changed_at = new Date();
  }

  //  TRANSACTION
  return await prisma.$transaction(async (tx) => {
    const updatedPax = await tx.pax.update({
      where: { pax_id: paxId },
      data: updateData,
    });

    if (Object.keys(authUpdate).length > 0) {
      await tx.auth_user.update({
        where: { pax_id: paxId },
        data: authUpdate,
      });
    }

    return updatedPax;
  });
};

// ================= PROFILE =================
exports.getProfileold = async (paxId) => {
  return await prisma.pax.findUnique({
    where: { pax_id: paxId },
    include: {
      auth_user: true,
      pax_device: true,
      pax_emergency_contact: true,
    },
  });
};
exports.getProfile = async (paxId) => {
  return await prisma.pax.findUnique({
    where: { pax_id: paxId },
    include: {
      auth_user: {
        include: {
          auth_face_profile: true,
        },
      },
      pax_device: true,
      pax_emergency_contact: true,
    },
  });
};
exports.getDevices = async (paxId, currentDeviceId) => {
  const devices = await prisma.pax_device.findMany({
    where: {
      pax_id: paxId,
    },
    orderBy: {
      last_login_at: "desc",
    },
  });

  return devices.map((d) => ({
    deviceId: d.device_token,
    deviceName: d.device_name,
    deviceType: d.device_type,
    isActive: d.is_active,
    lastLogin: d.last_login_at,
    city: d.city,
    country: d.country,

    //  highlight current device
    isCurrentDevice: d.device_token === currentDeviceId,
  }));
};
// ================= CHANGE PASSWORD =================
exports.changePassword = async (paxId, oldPass, newPass) => {
  if (!oldPass || !newPass) {
    throw new Error("Old password and new password are required");
  }

  const auth = await prisma.auth_user.findUnique({
    where: { pax_id: paxId },
  });

  if (!auth || !auth.password_hash) {
    throw new Error("Password not set");
  }

  const isMatch = await bcrypt.compare(oldPass, auth.password_hash);
  if (!isMatch) throw new Error("Old password is incorrect");

  const hash = await bcrypt.hash(newPass, 10);

  await prisma.$transaction(async (tx) => {
    //  Update password
    await tx.auth_user.update({
      where: { pax_id: paxId },
      data: {
        password_hash: hash,
        last_password_changed_at: new Date(),
      },
    });

    //  Logout ALL devices
    await tx.pax_device.updateMany({
      where: { pax_id: paxId },
      data: {
        is_active: false,
        refresh_token: null,
        refresh_token_expiry: null,
        modified_at: new Date(),
      },
    });
  });
};
exports.addEmergencyContact = async (paxId, data) => {
  if (!data.contact_name || !data.mobile_no) {
    throw new Error("Name and mobile number are required");
  }

  return await prisma.pax_emergency_contact.create({
    data: {
      pax_id: paxId,
      contact_name: data.contact_name.trim(),
      relationship: data.relationship?.trim(),
      country_code: data.country_code || "+91",
      mobile_no: data.mobile_no,
      email: data.email?.trim(),
      address: data.address?.trim(),
      is_primary: data.is_primary ?? true,
      created_at: new Date(),
    },
  });
};

exports.getEmergencyContactsold = async (paxId) => {
  return await prisma.pax_emergency_contact.findMany({
    where: {
      pax_id: paxId,
    },
    orderBy: {
      created_at: "desc",
    },
  });
};
exports.getEmergencyContacts = async (paxId, query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;

  const skip = (page - 1) * limit;

  const total = await prisma.pax_emergency_contact.count({
    where: { pax_id: paxId },
  });

  const contacts = await prisma.pax_emergency_contact.findMany({
    where: { pax_id: paxId },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });

  return {
    data: contacts,
    pagination: {
      page,
      limit,
      total,
    },
  };
};
exports.updateEmergencyContact = async (paxId, contactId, data) => {
  const contact = await prisma.pax_emergency_contact.findFirst({
    where: {
      emergency_contact_id: contactId,
      pax_id: paxId,
    },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  return await prisma.pax_emergency_contact.update({
    where: {
      emergency_contact_id: contactId,
    },
    data: {
      contact_name: data.contact_name?.trim(),
      relationship: data.relationship?.trim(),
      country_code: data.country_code,
      mobile_no: data.mobile_no,
      email: data.email?.trim(),
      address: data.address?.trim(),
      is_primary: data.is_primary,
      modified_at: new Date(),
    },
  });
};
exports.deleteEmergencyContact = async (paxId, contactId) => {
  const contact = await prisma.pax_emergency_contact.findFirst({
    where: {
      emergency_contact_id: contactId,
      pax_id: paxId,
    },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  return await prisma.pax_emergency_contact.delete({
    where: {
      emergency_contact_id: contactId,
    },
  });
};
