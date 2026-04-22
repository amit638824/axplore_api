/**
 * Production-ready Express Server
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
//const { apiLimiter } = require('./src/middleware/rateLimiter');
const { processReminders } = require('./src/services/reminder.service');

const fileUpload = require('express-fileupload');
const app = express();


app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors({
   origin: ['https://axplore-dev.alphadroid.dev', 'https://axplore.demowithme.com', ' https://travelplus.demowithme.com/', 'http://localhost:3000/', 'http://localhost:3000'],
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
   allowedHeaders: ['Content-Type', 'Authorization'],
   credentials: true
}));



/* ======================================================
   TRUST PROXY (required behind nginx / load balancer)
====================================================== */
app.set('trust proxy', 1);

/* ======================================================
   CORS CONFIGURATION
====================================================== */

// app.use((req, res, next) => {
//   console.log("Incoming Origin:", req.headers.origin);
//   next();
// });

// app.use(cors({
//   origin: ['https://axplore.demowithme.com'],
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true
// }));
//app.use(cors());

// const allowedOrigins = [
//   'https://axplore.demowithme.com',
//   'http://localhost:3000'
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow server-to-server requests (no origin header)
//     if (!origin) return callback(null, true);

//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }

//     console.warn('Blocked by CORS:', origin);
//     return callback(null, false); // do NOT throw error
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));


/* ======================================================
   BODY PARSING HERE
====================================================== */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ======================================================
   RATE LIMITING
====================================================== */

//app.use('/api', apiLimiter);

/* ======================================================
   ROUTES
   
====================================================== */
//route we use thhis route for api//
app.use('/api', routes);
//const webApp = require('./src/web/app');
const mobileApp = require('./src/mobile/app');

//app.use('/api/web', webApp);
app.use('/api/mobile', mobileApp);
/* ======================================================
   404 + ERROR HANDLERS
====================================================== */

app.use(notFoundHandler);
app.use(errorHandler);

/* ======================================================
   START SERVER
====================================================== */

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
   console.log(`🚀 Server running on port ${PORT}`);
   console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

   // Start Lead Assignment Reminders (check every 30 minutes)
   const REMINDER_INTERVAL = 30 * 60 * 1000;
   setInterval(() => {
      processReminders().catch(err => console.error('Reminder background job error:', err));
   }, REMINDER_INTERVAL);

   // Run once on startup
   setTimeout(() => {
      processReminders().catch(err => console.error('Initial reminder job error:', err));
   }, 5000);
});

/* ======================================================
   GRACEFUL SHUTDOWN
====================================================== */

const shutdown = (signal) => {
   console.log(`${signal} received. Closing server...`);
   server.close(() => {
      console.log('Server closed.');
      process.exit(0);
   });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
