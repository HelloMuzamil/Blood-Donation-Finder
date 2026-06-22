/**
 * routes/aiRoutes.js
 * Defines Express routes for AI features
 */
const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const { chat, generateOutreach, submitFeedback } = require('../controllers/aiController');
const { protect }                                = require('../middleware/auth');
const { validateAIChat, validateAIOutreach, validateAIFeedback } = require('../middleware/validate');

// Optional authentication middleware — attaches user if logged in, allows guests
const optionalProtect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token   = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user      = decoded;
    }
  } catch (err) {
    // Ignore invalid tokens — guest continues without user context
  }
  next();
};

// Mount endpoints
router.post('/chat',              optionalProtect, validateAIChat,     chat);
router.post('/generate-outreach', protect,         validateAIOutreach, generateOutreach);
router.post('/feedback',          optionalProtect, validateAIFeedback, submitFeedback);

module.exports = router;
