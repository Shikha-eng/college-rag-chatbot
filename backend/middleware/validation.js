const { body, validationResult, param, query } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * User registration validation
 */
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('role')
    .optional()
    .isIn(['student', 'admin'])
    .withMessage('Role must be either student or admin'),
  
  body('studentId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Student ID must be between 1 and 20 characters'),
  
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('whatsappNumber')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid WhatsApp number'),
  
  body('primaryLanguage')
    .optional()
    .isIn(['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari'])
    .withMessage('Invalid primary language'),
  
  handleValidationErrors
];

/**
 * User login validation
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Chat message validation
 */
const validateChatMessage = [
  body('message')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  
  body('language')
    .optional()
    .isIn(['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari'])
    .withMessage('Invalid language'),
  
  body('platform')
    .optional()
    .isIn(['web', 'whatsapp'])
    .withMessage('Platform must be either web or whatsapp'),
  
  handleValidationErrors
];

/**
 * Admin response validation
 */
const validateAdminResponse = [
  param('questionId')
    .isMongoId()
    .withMessage('Invalid question ID'),
  
  body('response')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Response must be between 1 and 2000 characters'),
  
  body('responseLanguage')
    .optional()
    .isIn(['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari'])
    .withMessage('Invalid response language'),
  
  handleValidationErrors
];

/**
 * Document upload validation
 */
const validateDocumentUpload = [
  body('title')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('content')
    .optional()
    .trim()
    .isLength({ max: 50000 })
    .withMessage('Content cannot exceed 50000 characters'),
  
  body('contentType')
    .optional()
    .isIn(['text', 'faq', 'announcement', 'policy', 'academic', 'event', 'contact'])
    .withMessage('Invalid content type'),
  
  body('language')
    .optional()
    .isIn(['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari', 'mixed'])
    .withMessage('Invalid language'),
  
  handleValidationErrors
];

/**
 * WhatsApp webhook validation
 */
const validateWhatsAppWebhook = [
  body('From')
    .notEmpty()
    .withMessage('From field is required'),
  
  body('Body')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message body cannot exceed 1000 characters'),
  
  handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * Search validation
 */
const validateSearch = [
  query('q')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  
  query('language')
    .optional()
    .isIn(['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari'])
    .withMessage('Invalid language filter'),
  
  query('contentType')
    .optional()
    .isIn(['text', 'faq', 'announcement', 'policy', 'academic', 'event', 'contact'])
    .withMessage('Invalid content type filter'),
  
  handleValidationErrors
];

/**
 * User profile update validation
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('whatsappNumber')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid WhatsApp number'),
  
  body('primaryLanguage')
    .optional()
    .isIn(['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari'])
    .withMessage('Invalid primary language'),
  
  body('course')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Course cannot exceed 100 characters'),
  
  body('year')
    .optional()
    .isInt({ min: 1, max: 6 })
    .withMessage('Year must be between 1 and 6'),
  
  handleValidationErrors
];

/**
 * Password change validation
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateChatMessage,
  validateAdminResponse,
  validateDocumentUpload,
  validateWhatsAppWebhook,
  validatePagination,
  validateSearch,
  validateProfileUpdate,
  validatePasswordChange,
  handleValidationErrors
};