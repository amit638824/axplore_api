/**
 * Main Routes Index
 * Aggregates all route modules
 */

const express = require("express");
const router = express.Router();
const authRoutes = require("./auth.routes");
const leadRoutes = require("./lead.routes");
const leadTripRoutes = require("./leadTrip.routes");
const segmentRoutes = require("./segment.routes");
const countryRoutes = require("./country.routes");
const cityRoutes = require("./city.routes");
const stateRoutes = require("./state.routes");
const designationRoutes = require("./designation.routes");
const roleRoutes = require("./role.routes");
const permissionRoutes = require("./permission.routes");


const destinationRoutes = require('./destination.routes');
const leadstatusRoutes = require('./leadstatus.routes');
const corporateRoutes = require('./corporate.routes');
const costsheetRoutes = require('./costsheet.routes');
const corporateDivisionRoutes = require('./corporateDivision.routes');
const corporateSubDivisionRoutes = require('./corporateSubDivision.routes');
const dashboardRoutes = require('./dashboard.routes.js');
const user = require('./user.routes');
const proposalRoutes = require('./proposal.routes');
const documentRoutes = require('./document.routes');
const pickupHubRoutes = require('./pickupHub.routes');
const leadActivityRoutes = require('./leadActivity.routes');

// mobile app apis starts here

const mobileauthRoutes = require("../mobile/routes/auth/auth.routes.js");

// ends here

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes //
router.use("/auth", authRoutes);
router.use("/leads", leadRoutes);
router.use("/leads/deactivate-hub", leadRoutes);

router.use("/leads/update", leadRoutes);
router.use("/leads/totalLeads", leadRoutes);
router.use("/leads/totalLeadStatus", leadRoutes);
router.use("/leads/alldataByLeadId", leadRoutes);
router.use("/leads/destinationReport", leadRoutes);



router.use('/leads/status', leadRoutes);
router.use('/leads/requirement', leadRoutes);
router.use('/trip', leadTripRoutes);
router.use('/trip/update', leadTripRoutes);
router.use('/segments', segmentRoutes);
router.use('/costsheet', costsheetRoutes);
router.use('/costsheet/id', costsheetRoutes);
router.use('/costsheet/add', costsheetRoutes);
router.use('/costsheet/update', costsheetRoutes);
router.use('/costsheet/deactivate', costsheetRoutes);

router.use('/country', countryRoutes);
router.use('/city', cityRoutes);
router.use('/city/getOrigins', cityRoutes);
router.use('/state', stateRoutes);
router.use('/designations', designationRoutes);
router.use('/destination', destinationRoutes);
router.use('/users', user);
router.use('/users/add', user);
router.use('/users/delete', user);
router.use('/users/list/userdata', user);
router.use('/leadstatus', leadstatusRoutes);
router.use('/corporate', corporateRoutes);
router.use('/corporate/add', corporateRoutes);
router.use('/corporate/list', corporateRoutes);
router.use('/corporate/updateStatus', corporateRoutes);
router.use('/corporate/contactPersonList', corporateRoutes);
router.use('/corporate/contactPerson', corporateRoutes);
router.use('/corporate/addContactPerson', corporateRoutes);
router.use('/corporate/deleteContactPerson', corporateRoutes);
router.use('/corporateDivision', corporateDivisionRoutes);
router.use('/corporateDivision/add', corporateDivisionRoutes);
router.use('/corporateDivision/list', corporateDivisionRoutes);
router.use('/corporateDivision/updateStatus', corporateDivisionRoutes);
router.use('/corporateSubDivision', corporateSubDivisionRoutes);
router.use('/corporateSubDivision/id', corporateSubDivisionRoutes);
router.use('/corporateSubDivision/add', corporateSubDivisionRoutes);
router.use('/corporateSubDivision/delete', corporateSubDivisionRoutes);
router.use('/corporateSubDivision/address/list', corporateSubDivisionRoutes);
router.use('/corporateSubDivision/addresslist', corporateSubDivisionRoutes);
router.use('/proposal', proposalRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/documents', documentRoutes);
router.use('/pickup-hub', pickupHubRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/lead-activity', leadActivityRoutes);
////router.use('/role/list', roleRoutes);///

module.exports = router;
