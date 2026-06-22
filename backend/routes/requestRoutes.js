/**
 * routes/requestRoutes.js
 */
const express  = require('express');
const router   = express.Router();
const {
  createRequest, getActiveRequests, getMyRequests,
  updateRequestStatus, fulfillRequest, getRequestDonors
} = require('../controllers/requestController');
const { protect }                                                           = require('../middleware/auth');
const { validateCreateRequest, validateUpdateStatus, validateFulfill }      = require('../middleware/validate');

router.get('/active',        getActiveRequests);                                          // Public
router.post('/',             protect, validateCreateRequest, createRequest);
router.get('/mine',          protect, getMyRequests);
router.put('/:id/status',    protect, validateUpdateStatus, updateRequestStatus);
router.post('/:id/fulfill',  protect, validateFulfill, fulfillRequest);
router.get('/:id/donors',    protect, getRequestDonors);

module.exports = router;