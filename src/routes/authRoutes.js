const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * Validation rules for registration
 */
const registerValidation = [
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
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone number must be between 7 and 20 digits'),
];

/**
 * Validation rules for login
 */
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Employee registration
router.post('/register', registerValidation, validateRequest, AuthController.register);

// Employee login
router.post('/login', loginValidation, validateRequest, AuthController.login);

// Current employee profile
router.get('/me', authenticate, AuthController.getProfile);

module.exports = router;
