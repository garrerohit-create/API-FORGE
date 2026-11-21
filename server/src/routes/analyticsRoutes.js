import express from 'express';
import { AnalyticsService } from '../services/analyticsService.js';

const router = express.Router();

// Get workspace analytics (metrics, percentiles, distribution, timeline)
router.get('/workspaces/:workspaceId/analytics', (req, res, next) => {
  try {
    const { timeRange, method, collectionId } = req.query;
    const analytics = AnalyticsService.getWorkspaceAnalytics(req.params.workspaceId, {
      timeRange,
      method,
      collectionId
    });

    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

export default router;
