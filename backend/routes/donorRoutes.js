/**
 * routes/donorRoutes.js
 */
const express  = require('express');
const router   = express.Router();
const {
  searchDonors, getDonorById, updateAvailability,
  getMyProfile, updateProfile, getPublicStats
} = require('../controllers/donorController');
const { protect }                                         = require('../middleware/auth');
const { validateUpdateProfile, validateAvailability }     = require('../middleware/validate');

router.get('/',                searchDonors);                              // Public search
router.get('/stats',           getPublicStats);                            // Public stats
router.get('/profile/me',      protect, getMyProfile);                     // Own profile (auth required)
router.put('/availability',    protect, validateAvailability, updateAvailability);
router.put('/profile',         protect, validateUpdateProfile, updateProfile);
router.get('/:id',             getDonorById);                              // Public donor profile

module.exports = router;