const express = require("express");
const router = express.Router();

const mobileAuthRoutes = require("./auth/auth.routes");
const userAuthRoutes = require("./user/user");
const faqRoutes = require("./faq/faq")
const tripRoutes = require("./user/trip/trip.routes")
const sosRoutes = require("./sos/sos.routes");
const notificationRoutes = require("./notification/notification.routes");


// mobile APIs
router.use("/onboarding", mobileAuthRoutes);
router.use("/user", userAuthRoutes);
router.use("/faq", faqRoutes);
router.use("/trips", tripRoutes);
router.use("/sos", sosRoutes);
router.use("/notifications", notificationRoutes);


module.exports = router;