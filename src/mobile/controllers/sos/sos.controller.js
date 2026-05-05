const service = require("../../services/mobileapp/sos.service");
const { asyncHandler } = require("../../../middleware/errorHandler");

/**
 * Trigger SOS Alert
 */
exports.triggerSos = asyncHandler(async (req, res) => {
  try {
    // Inject paxId from token if not in body
    if (!req.body.paxId && req.user) {
      req.body.paxId = req.user.paxId || req.user.pax_id;
    }
    
    const data = await service.triggerSos(req.body);

    
    return res.status(201).json({
      status: true,
      message: "SOS alert triggered successfully.",
      data
    });
  } catch (error) {
    console.error("SOS TRIGGER ERROR:", error);
    
    return res.status(500).json({
      status: false,
      message: "Unable to trigger SOS. Please try again.",
      error: {
        code: 500,
        details: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
      }
    });
  }
});

/**
 * Get SOS Master List
 */
exports.getMasterList = asyncHandler(async (req, res) => {
  const data = await service.getMasterList();
  return res.status(200).json({
    status: true,
    message: "SOS master list fetched successfully.",
    data
  });
});
