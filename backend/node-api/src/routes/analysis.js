const express = require('express');
const { getPlatformMetrics, buildMetricSummary } = require('../services/engagement');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'A URL is required.' });
    }

    const result = await getPlatformMetrics(url);
    const summary = buildMetricSummary([result.metrics]);

    return res.json({
      platform: result.platform,
      url: result.url,
      metrics: result.metrics,
      summary,
      audienceProfile: result.audienceProfile,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to analyze URL.' });
  }
});

module.exports = router;
