/**
 * routes/adminRoutes.js
 */
const express = require('express');
const router  = express.Router();
const { getStats, getAllUsers, getAllRequests, toggleUserStatus, deleteUser } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly); // All admin routes require auth + admin role

router.get('/stats',              getStats);
router.get('/users',              getAllUsers);
router.get('/requests',           getAllRequests);
router.put('/users/:id/status',   toggleUserStatus);
router.delete('/users/:id',       deleteUser);

module.exports = router;