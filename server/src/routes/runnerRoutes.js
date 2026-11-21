import express from 'express';
import { CollectionRunnerService } from '../services/collectionRunnerService.js';

const router = express.Router();

// Run collection sequentially
router.post('/collections/:id/run', async (req, res, next) => {
  try {
    const { workspaceId, environmentId = null, iterations = 1, selectedRequestIds = null } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required.' } });
    }

    const summary = await CollectionRunnerService.runCollection(req.params.id, {
      workspaceId,
      environmentId,
      iterations,
      selectedRequestIds
    });

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// Cancel collection run
router.delete('/collection-runs/:id', (req, res) => {
  const cancelled = CollectionRunnerService.cancelRun(req.params.id);
  if (cancelled) {
    res.json({ success: true, message: 'Collection run cancelled.' });
  } else {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Run not found or already completed.' } });
  }
});

export default router;
