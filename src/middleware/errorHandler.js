/**
 * Global Error Handler Middleware
 * Centralized error handling for the application
 */

const { HTTP_STATUS } = require('../config/constants');
const { AppError } = require('../utils/errors');
const { error } = require('../utils/response');

/**
 * Handle Prisma errors
 */
const handlePrismaError = (err) => {
  if (err.code === 'P2002') {
    // Unique constraint violation
    const target = err.meta?.target || [];
    const fieldName = target[0] || 'field';
    
    // Log detailed error information for debugging
    console.error('Prisma Unique Constraint Error:', {
      code: err.code,
      field: fieldName,
      target: target,
      meta: err.meta,
      model: err.meta?.model || 'Unknown',
      fullError: process.env.NODE_ENV === 'development' ? err : undefined,
    });
    
    // Map database field names to user-friendly names
    const fieldMapping = {
      email: 'Email',
      mobile: 'Mobile number',
      employee_code: 'Employee code',
      corporate_code: 'Corporate code',
      branch_code: 'Branch code',
      role_code: 'Role code',
      permission_code: 'Permission code',
      menu_code: 'Menu code',
      sub_menu_code: 'Sub menu code',
      hub_code: 'Hub code',
      designation_code: 'Designation code',
      segment_code: 'Segment code',
      status_code: 'Status code',
      category_code: 'Category code',
      service_type_code: 'Service type code',
      level_code: 'Level code',
    };
    
    const friendlyFieldName = fieldMapping[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return {
      message: `${friendlyFieldName} already exists. Please use a different value.`,
      statusCode: HTTP_STATUS.CONFLICT,
      field: fieldName,
      model: err.meta?.model || null,
    };
  }

  if (err.code === 'P2025') {
    // Record not found
    return {
      message: 'Record not found',
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (err.code === 'P2003') {
    // Foreign key constraint violation
    return {
      message: 'Invalid reference to related record',
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  return null;
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    code: err.code,
    name: err.name,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined,
    ...(err.meta && { prismaMeta: err.meta }),
  });

  // Handle Prisma errors
  if (err.code && err.code.startsWith('P')) {
    const prismaError = handlePrismaError(err);
    if (prismaError) {
      error.message = prismaError.message;
      error.statusCode = prismaError.statusCode;
      if (prismaError.field) {
        error.field = prismaError.field;
      }
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.statusCode = HTTP_STATUS.UNAUTHORIZED;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.statusCode = HTTP_STATUS.UNAUTHORIZED;
  }

  // Handle validation errors
  if (err.name === 'ValidationError' && err.errors) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // Default error
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = error.message || 'Internal server error';

  // Don't leak error details in production
  const errorMessage =
    process.env.NODE_ENV === 'production' && statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR
      ? 'Internal server error'
      : message;

  const response = {
    success: false,
    message: errorMessage,
  };

  // Add field information for conflict errors
  if (error.field) {
    response.field = error.field;
  }

  // Add model information for Prisma errors
  if (error.model) {
    response.model = error.model;
  }

  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    if (err.stack) {
      response.stack = err.stack;
    }
    if (err.code) {
      response.code = err.code;
    }
    if (err.meta) {
      response.meta = err.meta;
    }
  }

  return res.status(statusCode).json(response);
};

/**
 * Handle 404 errors
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, HTTP_STATUS.NOT_FOUND);
  next(error);
};

/**
 * Async handler wrapper to catch errors in async routes
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
