/**
 * Authentication Routes
 * Defines routes for authentication endpoints
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/auth.validator');

// Public routes
//router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/forgotPassword', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.get('/user_info', authenticate, authController.getUserInfo);
router.post('/switch-role', authenticate, authController.switchRole);
router.get('/salesref-users', authenticate, authController.getSalesRefUsersWithDetails);
router.get('/salesref-users-team', authenticate, authController.getSalesRefUsersTeam);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
