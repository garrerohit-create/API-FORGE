import express from 'express';
import { DocumentationService } from '../services/documentationService.js';

const router = express.Router();

// Generate OpenAPI 3.0 specification JSON
router.get('/workspaces/:workspaceId/openapi', (req, res, next) => {
  try {
    const spec = DocumentationService.generateOpenApiSpec(req.params.workspaceId);
    res.json(spec);
  } catch (err) {
    next(err);
  }
});

// Generate Markdown documentation
router.get('/workspaces/:workspaceId/docs/markdown', (req, res, next) => {
  try {
    const md = DocumentationService.generateMarkdown(req.params.workspaceId);
    res.type('text/markdown').send(md);
  } catch (err) {
    next(err);
  }
});

export default router;
