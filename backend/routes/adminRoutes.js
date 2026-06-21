/**
 * routes/adminRoutes.js
 */
const express = require('express');
const router = express.Router();
const {
  getStats,
  getAllUsers,
  getAllRequests,
  getRequestBatches,
  sendBatch,
  sendAllBatches,
  toggleUserStatus,
  deleteUser,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.get('/requests', getAllRequests);
router.get('/requests/:id/batches', getRequestBatches);
router.post('/requests/:id/batches/:batchNum/send', sendBatch);
router.post('/requests/:id/batches/send-all', sendAllBatches);
router.put('/users/:id/status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

module.exports = router;
