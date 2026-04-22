/**
 * Security Middleware
 * Additional security headers and configurations
 */

//const helmet = require('helmet');
const cors = require('cors');

/**
 * Configure CORS
 */
// const corsOptions = {
//   origin: function (origin, callback) {
//     // Allow requests with no origin (mobile apps, Postman, etc.) added url
//     if (!origin) return callback(null, true);

//     const allowedOrigins = process.env.ALLOWED_ORIGINS
//       ? process.env.ALLOWED_ORIGINS.split(',')
//       : ['http://localhost:3000', 'https://axplore-dev.alphadroid.dev'];

//     if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   optionsSuccessStatus: 200,
// };


// const corsOptions = {
//   origin: function (origin, callback) {
//     // Allow requests with no origin (mobile apps, Postman, etc.) added url
//     if (!origin) return callback(null, true);

//     const allowedOrigins = process.env.ALLOWED_ORIGINS
//       ? process.env.ALLOWED_ORIGINS.split(',')
//       : ['https://axplore.demowithme.com'];

//     if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   optionsSuccessStatus: 200,
//   methods: ['GET','POST','PUT','DELETE','OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
  
// };


/**
 * Security middleware setup
 */
// const securityMiddleware = [
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         styleSrc: ["'self'", "'unsafe-inline'"],
//         scriptSrc: ["'self'"],
//         imgSrc: ["'self'", 'data:', 'https:'],
//       },
//     },
//     crossOriginEmbedderPolicy: false,
//   }),
//   cors(corsOptions),
  
// ];

// module.exports = securityMiddleware;
