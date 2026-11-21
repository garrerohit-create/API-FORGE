import express from 'express';
import { ImportExportService } from '../services/importExportService.js';

const router = express.Router();

// Export collection (Native format)
router.get('/collections/:id/export', (req, res, next) => {
  try {
    const exported = ImportExportService.exportCollection(req.params.id);
    res.setHeader('Content-Disposition', `attachment; filename="collection-${req.params.id}.json"`);
    res.json(exported);
  } catch (err) {
    next(err);
  }
});

// Import collection (Native format or Postman v2.1)
router.post('/workspaces/:workspaceId/import', (req, res, next) => {
  try {
    const { format = 'auto', data } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Import data payload is required.' } });
    }

    let payload = data;
    if (typeof data === 'string') {
      try {
        payload = JSON.parse(data);
      } catch {
        return res.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Import payload must be valid JSON.' } });
      }
    }

    if (payload.schemaVersion === 'api-forge/v1' || format === 'native') {
      const result = ImportExportService.importNativeCollection(req.params.workspaceId, payload);
      return res.status(201).json(result);
    }

    if (payload.info && payload.item) {
      const result = ImportExportService.importPostmanCollection(req.params.workspaceId, payload);
      return res.status(201).json(result);
    }

    return res.status(400).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_IMPORT_FORMAT',
        message: 'Unsupported file format. Please supply an API FORGE collection (api-forge/v1) or Postman Collection v2.1 file.'
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
