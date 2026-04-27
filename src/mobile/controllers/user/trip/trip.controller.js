const tripService = require("../../../services/mobileapp/trip.service");
const { paginated ,success} = require("../../../../utils/response");
const { uploadToS3 } = require("../../../utils/s3Upload");
const { prisma } = require("../../../../config/database");




exports.getMyTrips = async (req, res, next) => {
  try {
    const userId = req.user.pax_id;

    const { page, limit, search, status } = req.query;

    const result = await tripService.getMyTrips(userId, {
      page,
      limit,
      search,
      status
    });

    return paginated(res, result.data, result.meta);

  } catch (err) {
    next(err);
  }
};
exports.getTripById = async (req, res, next) => {
  try {
    const userId = req.user.pax_id;
    const { tripId } = req.params;

    const result = await tripService.getTripById(userId, tripId);

    return success(res, result);
  } catch (err) {
    next(err);
  }
};
exports.joinTrip = async (req, res, next) => {
  try {
    const paxId = req.user.pax_id;
    const appUserId = req.user.userId;

    const { tripCode, joinedVia } = req.body;

    const result = await tripService.joinTrip(paxId, appUserId, {
      tripCode,
      joinedVia,
    });

    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.getStatusTracker = async (req, res, next) => {
  try {
    const paxId = req.user.pax_id;
    const { tripId } = req.body;

    const result = await tripService.getStatusTracker(paxId, tripId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.updateTripDetails = async (req, res, next) => {
  try {
    const paxId = req.user.pax_id;
    const { tripId, userDetails } = req.body;

    const result = await tripService.updateTripUserDetails(paxId, tripId, userDetails);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.uploadPassport = async (req, res, next) => {
  try {
    if (!req.file) throw new Error("No file uploaded");
    const paxId = req.user.pax_id;
    const { tripId, documentType, scannedText } = req.body;
    
    const fileUrl = await uploadToS3(req.file, req.file.originalname);
    
    let parsedScannedText = scannedText;
    if (typeof scannedText === 'string') {
      try {
        parsedScannedText = JSON.parse(scannedText);
      } catch (e) {
        console.warn('Failed to parse scannedText, using as string:', e.message);
      }
    }

    const result = await tripService.uploadPaxDocument(
      paxId, 
      tripId, 
      documentType, 
      fileUrl, 
      parsedScannedText
    );

    return success(res, result);
  } catch (err) {
    next(err);
  }
};

