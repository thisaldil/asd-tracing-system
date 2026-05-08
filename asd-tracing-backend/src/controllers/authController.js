const Parent = require('../models/Parent');
const jwt = require('jsonwebtoken');

/**
 * Register a new parent account
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    // Validate input
    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if parent already exists
    const existing = await Parent.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create parent
    const parent = new Parent({
      fullName,
      email,
      passwordHash: password
    });

    await parent.save();

    // Generate JWT token
    const token = jwt.sign(
      { parentId: parent._id, email: parent.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-prod',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      parent: parent.toJSON()
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Login parent account
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find parent
    const parent = await Parent.findOne({ email });
    if (!parent) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare passwords
    const isValid = await parent.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { parentId: parent._id, email: parent.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-prod',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      parent: parent.toJSON()
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Verify JWT token (used by client to check if logged in)
 * POST /api/auth/verify
 */
const verify = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-prod'
    );

    const parent = await Parent.findById(decoded.parentId);
    if (!parent) {
      return res.status(401).json({ error: 'Parent not found' });
    }

    res.json({
      token,
      parent: parent.toJSON()
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { register, login, verify };
