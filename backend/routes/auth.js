const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user (student or admin)
 * @access  Public
 */
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { email, password, name, role = 'student', studentId, phone, whatsappNumber, primaryLanguage = 'english' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: 'Registration failed',
        message: 'User with this email already exists'
      });
    }

    // Check if studentId already exists (for students)
    if (role === 'student' && studentId) {
      const existingStudent = await User.findOne({ studentId });
      if (existingStudent) {
        return res.status(400).json({
          error: 'Registration failed',
          message: 'Student ID already exists'
        });
      }
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role,
      studentId: role === 'student' ? studentId : undefined,
      phone,
      whatsappNumber,
      primaryLanguage
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.studentId,
        primaryLanguage: user.primaryLanguage,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and verify password
    const user = await User.findByCredentials(email, password);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.studentId,
        primaryLanguage: user.primaryLanguage,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        studentId: req.user.studentId,
        course: req.user.course,
        year: req.user.year,
        phone: req.user.phone,
        whatsappNumber: req.user.whatsappNumber,
        primaryLanguage: req.user.primaryLanguage,
        preferredLanguages: req.user.preferredLanguages,
        isVerified: req.user.isVerified,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Profile fetch failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', authenticate, async (req, res) => {
  try {
    // Generate new JWT token
    const token = jwt.sign(
      { 
        userId: req.user._id, 
        email: req.user.email, 
        role: req.user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Token refreshed successfully',
      token
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a more complex setup, you might want to blacklist the token
    // For now, we'll just return a success response
    // The client should remove the token from storage
    
    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify if token is valid
 * @access  Private
 */
router.post('/verify-token', authenticate, async (req, res) => {
  try {
    res.json({
      valid: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role
      }
    });
  } catch (error) {
    res.status(401).json({
      valid: false,
      message: 'Invalid token'
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        error: 'Password change failed',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: 'Internal server error'
    });
  }
});

module.exports = router;