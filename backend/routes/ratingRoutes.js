/**
 * routes/ratingRoutes.js
 */
const express  = require('express');
const router   = express.Router();
const { submitRating, getDonorRatings }  = require('../controllers/ratingController');
const { protect }                        = require('../middleware/auth');
const { validateRating }                 = require('../middleware/validate');

router.post('/',           protect, validateRating, submitRating);
router.get('/:donor_id',   getDonorRatings);   // Public

module.exports = router;