const express = require('express');
const authRoutes = require('./authRoutes');
const enquiryRoutes = require('./enquiryRoutes');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CRM API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular sub-routers
router.use('/auth', authRoutes);
router.use('/enquiries', enquiryRoutes);

module.exports = router;
