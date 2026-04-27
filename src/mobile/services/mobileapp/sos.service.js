const { prisma } = require("../../../config/database");

/**
 * Trigger SOS Alert
 * @param {Object} data 
 */
exports.triggerSos = async (data) => {
  const { paxId, tripId, mobileNumber, latitude, longitude, locationName, typeofemergency } = data;

  // Generate a friendly SOS ID/Code
  const sosCode = "SOS" + Math.floor(100000 + Math.random() * 900000);

  const sosRecord = await prisma.pax_sos.create({
    data: {
      sos_code: sosCode,
      pax_id: paxId,
      trip_id: tripId || null,
      mobile_no: mobileNumber,
      latitude,
      longitude,
      location_name: locationName,
      emergency_type: typeofemergency,
      status: "TRIGGERED",
    },
  });

  return {
    sosId: sosRecord.sos_code,
    paxId: sosRecord.pax_id,
    tripId: sosRecord.trip_id,
    mobileNumber: sosRecord.mobile_no,
    latitude: sosRecord.latitude,
    longitude: sosRecord.longitude,
    locationName: sosRecord.location_name,
    typeofemergency: sosRecord.emergency_type,
    createdAt: sosRecord.created_at,
  };
};

