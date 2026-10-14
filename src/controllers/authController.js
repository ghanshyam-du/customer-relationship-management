const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const UserModel = require('../models/userModel');

/**
 * Controller for Counselor/Employee Authentication
 */
class AuthController {
  /**
   * Register a new employee/counselor
   * POST /api/auth/register
   */
  static async register(req, res, next) {
    try {
      const { name, email, password, phone, role } = req.body;

      // Check if employee email is already registered
      const existingUser = await UserModel.existsByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An employee account with this email address already exists.',
        });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user record
      const newUser = await UserModel.create({
        name,
        email,
        password: hashedPassword,
        phone,
        role: role || 'counselor',
      });

      // Generate JWT Token
      const token = jwt.sign(
        {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return res.status(201).json({
        success: true,
        message: 'Counselor account registered successfully.',
        data: {
          token,
          user: newUser,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login employee/counselor with email and password
   * POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
      }

      // Generate JWT Token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Omit password from response
      const sanitizedUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
      };

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          token,
          user: sanitizedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get logged-in counselor profile
   * GET /api/auth/me
   */
  static async getProfile(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        message: 'User profile retrieved successfully.',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
