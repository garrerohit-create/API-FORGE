import express from 'express';
import { RequestExecutionService } from '../services/requestExecutionService.js';

const router = express.Router();

// Execute an HTTP request (from API Client or automation)
router.post('/', async (req, res, next) => {
  try {
    const {
      workspaceId,
      collectionId,
      requestId,
      environmentId,
      method = 'GET',
      urlTemplate,
      headers = [],
      queryParams = [],
      bodyType = 'none',
      bodyTemplate = null,
      auth = { type: 'none' },
      settings = {},
      assertions = [],
      requestSource = 'client'
    } = req.body;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required for request execution.' }
      });
    }

    if (!urlTemplate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'urlTemplate is required.' }
      });
    }

    const result = await RequestExecutionService.executeRequest({
      workspaceId,
      collectionId,
      requestId,
      environmentId,
      method,
      urlTemplate,
      headers,
      queryParams,
      bodyType,
      bodyTemplate,
      auth,
      settings,
      assertions,
      requestSource
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// Cancel a running execution
router.delete('/:id', (req, res) => {
  const cancelled = RequestExecutionService.cancelExecution(req.params.id);
  if (cancelled) {
    res.json({ success: true, message: 'Execution cancelled successfully.' });
  } else {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Active execution not found or already completed.' } });
  }
});

export default router;
