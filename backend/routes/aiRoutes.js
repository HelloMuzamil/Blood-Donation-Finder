/**
 * routes/aiRoutes.js
 * Defines Express routes for AI features
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { chat, generateOutreach, submitFeedback } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

// Optional authentication middleware to capture user details if logged in
const optionalProtect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch (err) {
    // Ignore invalid tokens for guest access
  }
  next();
};

// Mount endpoints
router.post('/chat', optionalProtect, chat);
router.post('/generate-outreach', protect, generateOutreach);
router.post('/feedback', optionalProtect, submitFeedback);

module.exports = router;
