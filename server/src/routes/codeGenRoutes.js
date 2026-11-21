import express from 'express';
import { CodeGenerationService } from '../services/codeGenerationService.js';

const router = express.Router();

// Generate code snippets in multiple formats (curl, fetch, axios, python, express)
router.post('/snippets', (req, res) => {
  const { request, mockEndpoint } = req.body;

  const snippets = {};

  if (request) {
    snippets.curl = CodeGenerationService.generateCurl(request);
    snippets.fetch = CodeGenerationService.generateFetch(request);
    snippets.axios = CodeGenerationService.generateAxios(request);
    snippets.python = CodeGenerationService.generatePython(request);
  }

  if (mockEndpoint) {
    snippets.expressRoute = CodeGenerationService.generateExpressRoute(mockEndpoint);
  }

  res.json({ success: true, data: snippets });
});

export default router;
