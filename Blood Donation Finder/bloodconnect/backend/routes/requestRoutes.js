/**
 * routes/requestRoutes.js
 */
const express = require('express');
const router  = express.Router();
const { createRequest, getActiveRequests, getMyRequests, updateRequestStatus } = require('../controllers/requestController');
const { protect } = require('../middleware/auth');

router.get('/active',       getActiveRequests);            // Public
router.post('/',            protect, createRequest);
router.get('/mine',         protect, getMyRequests);
router.put('/:id/status',   protect, updateRequestStatus);

module.exports = router;