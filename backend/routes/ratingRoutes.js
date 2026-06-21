/**
 * routes/ratingRoutes.js
 */
const express = require('express');
const router  = express.Router();
const { submitRating, getDonorRatings } = require('../controllers/ratingController');
const { protect } = require('../middleware/auth');

router.post('/',           protect, submitRating);
router.get('/:donor_id',   getDonorRatings);  // Public

module.exports = router;

// ────────────────────────────────────────────
// Save as routes/notificationRoutes.js as well