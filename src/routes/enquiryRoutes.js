const express = require('express');
const { body, param, query } = require('express-validator');
const EnquiryController = require('../controllers/enquiryController');
const { authenticate } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validateMiddleware');

const router = express.Router();

/**
 * Validation rules for public enquiry submission
 */
const publicEnquiryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone number must be between 7 and 20 digits'),
  body('courseInterest')
    .trim()
    .notEmpty()
    .withMessage('Course interest is required'),
  body('notes')
    .optional()
    .trim(),
  body('source')
    .optional()
    .trim(),
];

/**
 * Validation for claiming enquiry
 */
const claimValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Enquiry ID must be a positive integer'),
];

/**
 * Validation for updating status
 */
const updateStatusValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Enquiry ID must be a positive integer'),
  body('status')
    .optional()
    .isIn(['CLAIMED', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST'])
    .withMessage('Status must be one of: CLAIMED, CONTACTED, FOLLOW_UP, CONVERTED, LOST'),
  body('notes')
    .optional()
    .isString(),
];

// ==========================================
// 1. PUBLIC ROUTE (No Authentication)
// ==========================================
// Prospective clients fill this basic details form online or via counselor shared link
router.post('/public', publicEnquiryValidation, validateRequest, EnquiryController.submitPublicEnquiry);

// ==========================================
// 2. PROTECTED CRM ROUTES (JWT Required)
// ==========================================

// Fetch all unclaimed public enquiries inside CRM
router.get('/unclaimed', authenticate, EnquiryController.getUnclaimedEnquiries);

// Alias to satisfy both /unclaimed and /public GET if requested
router.get('/public', authenticate, EnquiryController.getUnclaimedEnquiries);

// Claim an enquiry by logged-in counselor
router.post('/:id/claim', authenticate, claimValidation, validateRequest, EnquiryController.claimEnquiry);
router.patch('/:id/claim', authenticate, claimValidation, validateRequest, EnquiryController.claimEnquiry);

// Fetch enquiries claimed by the logged-in counselor
router.get('/my-claims', authenticate, EnquiryController.getMyClaimedEnquiries);

// Get single enquiry detail
router.get('/:id', authenticate, claimValidation, validateRequest, EnquiryController.getEnquiryById);

// Update status / follow-up notes for claimed enquiry
router.patch('/:id/status', authenticate, updateStatusValidation, validateRequest, EnquiryController.updateStatus);

module.exports = router;
