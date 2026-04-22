/**
 * Document Controller
 * Express controllers for document endpoints
 */

const documentService = require('../services/document.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get lead documents list
 * @route GET /api/documents/lead
 */
const getLeadDocuments = asyncHandler(async (req, res) => {
  const documents = await documentService.getLeadDocuments();
  
  return success(res, documents, 'Lead documents retrieved successfully');
});

module.exports = {
  getLeadDocuments,
};
