const jwt = require("jsonwebtoken");
const { prisma } = require("../../config/database");

const paxAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const headerDeviceToken = req.headers["device-token"];

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        statusCode: 401,
        data: null,
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { paxId, deviceId } = decoded;

    if (!paxId || !deviceId) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
        statusCode: 401,
        data: null,
      });
    }

    const device = await prisma.pax_device.findFirst({
      where: {
        pax_id: paxId,
        device_token: deviceId,
        is_active: true,
      },
      include: {
        pax: true,
      },
    });

    if (!device || !device.pax) {
      return res.status(401).json({
        success: false,
        message: "Session expired",
        statusCode: 401,
        data: null,
      });
    }

    if (device.pax.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User inactive",
        statusCode: 403,
        data: null,
      });
    }

    // optional optimized update
    if (!device.last_login_at || Date.now() - new Date(device.last_login_at).getTime() > 5 * 60 * 1000) {
      await prisma.pax_device.update({
        where: { pax_device_id: device.pax_device_id },
        data: { last_login_at: new Date() },
      });
    }

    req.user = {
      pax_id: device.pax.pax_id,
      mobile_no: device.pax.mobile_no,
    };

    req.device = device;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.name === "TokenExpiredError" ? "Token expired" : "You are unauthorized",
      statusCode: 401,
      data: null,
    });
  }
};

module.exports = { paxAuth };
