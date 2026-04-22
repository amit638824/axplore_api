const multer = require('multer');
const path = require('path');

// Storage config - using memoryStorage for S3 workflows
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = upload;