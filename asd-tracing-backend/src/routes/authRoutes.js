const express = require('express');
const router = express.Router();
const { register, login, verify } = require('../controllers/authController');

// Register a new parent account
router.post('/register', register);

// Login
router.post('/login', login);

// Verify token
router.post('/verify', verify);

module.exports = router;
