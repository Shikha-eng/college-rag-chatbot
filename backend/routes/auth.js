const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
let User; // Lazy require only if DB enabled
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Flags
const DISABLE_DB = (process.env.DISABLE_DB || '').toLowerCase() === 'true';
const PROTOTYPE_MODE = (process.env.PROTOTYPE_MODE || '').toLowerCase() === 'true';
const IN_MEMORY_AUTH = DISABLE_DB || PROTOTYPE_MODE;
const JWT_SECRET = process.env.JWT_SECRET || 'temporary-dev-secret';

// In-memory store (non-persistent) for prototype mode
const memoryUsers = [];

// Helper: generate simple id
const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Minimal input validation (since express-validator slated for removal)
function basicValidate(fields, reqBody) {
  const errors = [];
  for (const f of fields) {
    if (f.required && (reqBody[f.name] === undefined || reqBody[f.name] === '')) {
      errors.push(`${f.name} is required`);
    }
    if (f.min && reqBody[f.name] && reqBody[f.name].length < f.min) {
      errors.push(`${f.name} must be at least ${f.min} chars`);
    }
  }
  return errors;
}

if (!IN_MEMORY_AUTH) {
  // Only require mongoose model when DB active
  User = require('../models/User');
}

/**
 * @route   POST /api/auth/register
 * @desc    Register new user (student or admin)
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'student', studentId, phone, whatsappNumber, primaryLanguage = 'english' } = req.body;

    const vErrors = basicValidate([
      { name: 'email', required: true },
      { name: 'password', required: true, min: 3 },
      { name: 'name', required: true, min: 2 }
    ], req.body);
    if (vErrors.length) return res.status(400).json({ error: 'Validation failed', details: vErrors });

    if (IN_MEMORY_AUTH) {
      const exists = memoryUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) return res.status(400).json({ error: 'Registration failed', message: 'Email already exists' });
      const hashed = await bcrypt.hash(password, 8);
      const user = {
        id: genId(),
        email: email.toLowerCase(),
        password: hashed,
        name,
        role,
        studentId: role === 'student' ? studentId : undefined,
        phone,
        whatsappNumber,
        primaryLanguage,
        createdAt: new Date()
      };
      memoryUsers.push(user);
      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({
        message: 'User registered (in-memory)',
        token,
        user: {
          id: user.id,
          email: user.email,
            name: user.name,
            role: user.role,
            studentId: user.studentId,
            primaryLanguage: user.primaryLanguage,
            createdAt: user.createdAt
        },
        prototype: true
      });
    }

    // DB path
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Registration failed', message: 'User with this email already exists' });
    if (role === 'student' && studentId) {
      const existingStudent = await User.findOne({ studentId });
      if (existingStudent) return res.status(400).json({ error: 'Registration failed', message: 'Student ID already exists' });
    }
    const user = new User({ email, password, name, role, studentId: role === 'student' ? studentId : undefined, phone, whatsappNumber, primaryLanguage });
    await user.save();
    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'User registered successfully', token, user: { id: user._id, email: user.email, name: user.name, role: user.role, studentId: user.studentId, primaryLanguage: user.primaryLanguage, createdAt: user.createdAt } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const vErrors = basicValidate([
      { name: 'email', required: true },
      { name: 'password', required: true }
    ], req.body);
    if (vErrors.length) return res.status(400).json({ error: 'Validation failed', details: vErrors });

    if (IN_MEMORY_AUTH) {
      const user = memoryUsers.find(u => u.email === email.toLowerCase());
      if (!user) return res.status(401).json({ error: 'Login failed', message: 'Invalid credentials' });
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ error: 'Login failed', message: 'Invalid credentials' });
      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ message: 'Login successful (in-memory)', token, user: { id: user.id, email: user.email, name: user.name, role: user.role, studentId: user.studentId, primaryLanguage: user.primaryLanguage }, prototype: true });
    }

    // DB path
    const user = await User.findByCredentials(email, password);
    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user: { id: user._id, email: user.email, name: user.name, role: user.role, studentId: user.studentId, primaryLanguage: user.primaryLanguage, lastLogin: user.lastLogin } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Login failed', message: error.message });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const u = req.user;
    res.json({ user: {
      id: u.id || u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      studentId: u.studentId,
      course: u.course,
      year: u.year,
      phone: u.phone,
      whatsappNumber: u.whatsappNumber,
      primaryLanguage: u.primaryLanguage,
      preferredLanguages: u.preferredLanguages,
      isVerified: u.isVerified,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt
    }, prototype: IN_MEMORY_AUTH });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Profile fetch failed', message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const u = req.user;
    const token = jwt.sign({ userId: u.id || u._id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Token refreshed successfully', token, prototype: IN_MEMORY_AUTH });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed', message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    res.json({ message: 'Logout successful', prototype: IN_MEMORY_AUTH });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed', message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify if token is valid
 * @access  Private
 */
router.post('/verify-token', authenticate, async (req, res) => {
  try {
    res.json({ valid: true, user: { id: req.user.id || req.user._id, email: req.user.email, name: req.user.name, role: req.user.role }, prototype: IN_MEMORY_AUTH });
  } catch (error) {
    res.status(401).json({ valid: false, message: 'Invalid token' });
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
    if (IN_MEMORY_AUTH) {
      const user = memoryUsers.find(u => (u.id || u._id) === (req.user.id || req.user._id));
      if (!user) return res.status(404).json({ error: 'Password change failed', message: 'User not found' });
      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) return res.status(400).json({ error: 'Password change failed', message: 'Current password incorrect' });
      user.password = await bcrypt.hash(newPassword, 8);
      return res.json({ message: 'Password changed successfully', prototype: true });
    }
    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ error: 'Password change failed', message: 'Current password is incorrect' });
    req.user.password = newPassword;
    await req.user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Password change failed', message: 'Internal server error' });
  }
});

module.exports = router;