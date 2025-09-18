const express = require('express');
const router = express.Router();

// Get application configuration
router.get('/', (req, res) => {
  try {
    const config = {
      refreshInterval: parseInt(process.env.DASHBOARD_REFRESH_INTERVAL) || 30000,
      maxNodes: parseInt(process.env.MAX_NETWORK_NODES) || 100,
      minSimilarity: parseFloat(process.env.MIN_NETWORK_SIMILARITY) || 0.3,
      enableRealTime: process.env.ENABLE_REAL_TIME_DASHBOARD === 'true',
      theme: process.env.DASHBOARD_THEME || 'light',
      features: {
        networkVisualization: true,
        timelineView: true,
        clusteringView: true,
        heatmapView: true,
        realTimeUpdates: process.env.ENABLE_REAL_TIME_DASHBOARD === 'true'
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration',
      message: error.message
    });
  }
});

module.exports = router;
