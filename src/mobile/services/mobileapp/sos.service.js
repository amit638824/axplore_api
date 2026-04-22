const { prisma } = require("../../../config/database");

/**
 * Trigger SOS Alert
 * @param {Object} data 
 */
exports.triggerSos = async (data) => {
  const { paxId, mobileNumber, latitude, longitude, locationName } = data;

  // Generate a friendly SOS ID/Code
  const sosCode = "SOS" + Math.floor(100000 + Math.random() * 900000);

  const sosRecord = await prisma.pax_sos.create({
    data: {
      sos_code: sosCode,
      pax_id: paxId,
      mobile_no: mobileNumber,
      latitude,
      longitude,
      location_name: locationName,
      status: "TRIGGERED",
    },
  });

  return {
    sosId: sosRecord.sos_code, // Returning the friendly code as requested (SOS789456)
    paxId: sosRecord.pax_id,
    mobileNumber: sosRecord.mobile_no,
    latitude: sosRecord.latitude,
    longitude: sosRecord.longitude,
    locationName: sosRecord.location_name,
    createdAt: sosRecord.created_at,
  };
};
