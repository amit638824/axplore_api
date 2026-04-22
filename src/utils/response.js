/**
 * Response Utility Functions
 * Standardized API response formatting
 */

const { HTTP_STATUS } = require('../config/constants');

/**
 * Send success response
 */
const success = (res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK) => {
  const response = {
    success: true,
    message,
    ...(data && { data }),
  };

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
const error = (res, message = 'An error occurred', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
  };

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
const paginated = (res, data, pagination, message = 'Success') => {
  const response = {
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  };

  return res.status(HTTP_STATUS.OK).json(response);
};

module.exports = {
  success,
  error,
  paginated,
};
