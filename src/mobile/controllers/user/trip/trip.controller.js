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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tripId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Trip ID format"
      });
    }

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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }
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

exports.getFlightDetails = async (req, res, next) => {
  try {
    const paxId = req.user.pax_id;
    const { tripId } = req.body;
    const result = await tripService.getFlightDetails(paxId, tripId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.getHotelDetails = async (req, res, next) => {
  try {
    const paxId = req.user.pax_id;
    const { tripId } = req.body;
    const result = await tripService.getHotelDetails(paxId, tripId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.getItinerary = async (req, res, next) => {
  try {
    const paxId = req.user.pax_id;
    const { tripId } = req.body;
    const result = await tripService.getItinerary(paxId, tripId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.getAdditionalDocuments = async (req, res, next) => {
  try {
    const paxId = req.user.pax_id;
    const { tripId } = req.body;
    const result = await tripService.getAdditionalDocuments(paxId, tripId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.getDownloadableFiles = async (req, res, next) => {
  try {
    const paxId = req.user.pax_id;
    const { tripId } = req.body;
    const result = await tripService.getDownloadableFiles(paxId, tripId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.getTripQRCode = async (req, res, next) => {
  try {
    const paxId = req.user.pax_id;
    const { tripId } = req.body;
    const result = await tripService.getTripQRCode(paxId, tripId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.addTrip = async (req, res, next) => {
  try {
    const { PaxId, paxId, tripId } = req.body;
    const finalPaxId = PaxId || paxId || req.user.pax_id;
    
    const result = await tripService.addTrip(finalPaxId, tripId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};


