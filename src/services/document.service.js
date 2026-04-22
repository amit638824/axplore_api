/**
 * Document Service
 * Business logic for master document operations
 */

const { prisma } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

/**
 * Get lead document list (where is_lead = true)
 */
const getLeadDocuments = async () => {
  const documents = await prisma.master_document.findMany({
    where: {
      is_lead: true,
      is_active: true
    },
    orderBy: {
      document_name: 'asc'
    }
  });

  return documents;
};

module.exports = {
  getLeadDocuments,
};
