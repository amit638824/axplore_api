const { prisma } = require("../../../config/database");

/**
 * Trigger SOS Alert
 * @param {Object} data 
 */
exports.triggerSos = async (data) => {
  const { paxId, paxID, mobileNumber, latitude, longitude, locationName, typeofemergency } = data;
  
  const finalPaxId = paxID || paxId;

  // Generate a friendly SOS ID/Code
  const sosCode = "SOS" + Math.floor(100000 + Math.random() * 900000);

  const sosRecord = await prisma.pax_sos.create({
    data: {
      sos_code: sosCode,
      pax_id: finalPaxId,
      trip_id: null, // As per request: remove tripID parameter
      mobile_no: mobileNumber || "N/A",
      latitude: String(latitude),
      longitude: String(longitude),
      location_name: locationName || "Current Location",
      emergency_type: typeofemergency,
      status: "TRIGGERED",
    },
  });

  return {
    sosId: sosRecord.sos_code,
    paxId: sosRecord.pax_id,
    mobileNumber: sosRecord.mobile_no,
    latitude: sosRecord.latitude,
    longitude: sosRecord.longitude,
    locationName: sosRecord.location_name,
    typeofemergency: sosRecord.emergency_type,
    createdAt: sosRecord.created_at,
  };
};

exports.getMasterList = async () => {
  return await prisma.master_sos_type.findMany({
    where: { is_active: true },
    orderBy: { priority: 'asc' }
  });
};


