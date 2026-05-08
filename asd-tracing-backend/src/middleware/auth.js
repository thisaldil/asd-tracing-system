const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token in Authorization header
 * Usage: router.get('/protected', requireAuth, controllerFunction)
 */
const requireAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-prod'
    );

    // Attach parentId to request for use in controllers
    req.parentId = decoded.parentId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { requireAuth };
