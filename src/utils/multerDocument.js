const multer = require('multer');

// Replaced local disk storage with memory storage for S3 uploads handling
const storage = multer.memoryStorage();

const uploadDocument = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = uploadDocument;
