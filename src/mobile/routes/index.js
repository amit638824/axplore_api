const express = require("express");
const router = express.Router();

const mobileAuthRoutes = require("./auth/auth.routes");
const userAuthRoutes = require("./user/user");
const faqRoutes = require("./faq/faq")
const tripRoutes = require("./user/trip/trip.routes")

// mobile APIs
router.use("/auth", mobileAuthRoutes);
router.use("/user", userAuthRoutes);
router.use("/faq", faqRoutes);
router.use("/trips", tripRoutes);

module.exports = router;