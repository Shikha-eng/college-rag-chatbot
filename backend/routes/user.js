const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /backend/routes/user/:id  -> fetch single user (basic safe fields)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email role primaryLanguage whatsappNumber isVerified');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /backend/routes/user  -> create minimal user (for testing)
router.post('/', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User exists' });

    const user = new User({
      email,
      password: 'temp_' + Math.random().toString(36).slice(2),
      name: name || 'User',
      role: 'student',
      primaryLanguage: 'english',
      isVerified: false
    });
    await user.save();
    res.status(201).json({ id: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Simple health check
router.get('/', (req, res) => {
  res.json({ status: 'user route ok' });
});

module.exports = router;
