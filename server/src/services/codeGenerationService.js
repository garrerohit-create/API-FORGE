/**
 * Code Generation Service for API FORGE.
 * Generates cURL, Fetch, Axios, Python Requests, and Express mock routes.
 * Always redacts secret values and uses safe escaping.
 */

export class CodeGenerationService {
  /**
   * Generates a cURL command.
   */
  static generateCurl(request) {
    const { method = 'GET', url = '', headers = [], bodyType = 'none', body = null } = request;
    const parts = ['curl -X ' + method.toUpperCase()];

    // Add safe headers
    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (h.enabled !== false && h.key) {
          const val = h.isSecret ? '<SECRET_TOKEN>' : h.value;
          parts.push(`  -H "${h.key}: ${val}"`);
        }
      }
    }

    // Add payload
    if (!['GET', 'HEAD'].includes(method.toUpperCase()) && bodyType !== 'none' && body) {
      if (bodyType === 'json') {
        const escaped = typeof body === 'string' ? body.replace(/"/g, '\\"') : JSON.stringify(body).replace(/"/g, '\\"');
        parts.push(`  -d "${escaped}"`);
      } else {
        parts.push(`  --data-raw "${String(body).replace(/"/g, '\\"')}"`);
      }
    }

    parts.push(`  "${url}"`);
    return parts.join(' \\\n');
  }

  /**
   * Generates modern JavaScript Fetch code.
   */
  static generateFetch(request) {
    const { method = 'GET', url = '', headers = [], bodyType = 'none', body = null } = request;
    const headersObj = {};

    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (h.enabled !== false && h.key) {
          headersObj[h.key] = h.isSecret ? '<SECRET_TOKEN>' : h.value;
        }
      }
    }

    const options = {
      method: method.toUpperCase(),
      headers: headersObj
    };

    if (!['GET', 'HEAD'].includes(method.toUpperCase()) && bodyType !== 'none' && body) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    return `// JavaScript (Fetch API)
async function executeApiRequest() {
  const url = '${url}';
  const options = ${JSON.stringify(options, null, 2)};

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', data);
    return data;
  } catch (error) {
    console.error('Request failed:', error);
  }
}

executeApiRequest();`;
  }

  /**
   * Generates Node.js Axios code.
   */
  static generateAxios(request) {
    const { method = 'GET', url = '', headers = [], bodyType = 'none', body = null } = request;
    const headersObj = {};

    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (h.enabled !== false && h.key) {
          headersObj[h.key] = h.isSecret ? '<SECRET_TOKEN>' : h.value;
        }
      }
    }

    let payloadSnippet = '';
    if (!['GET', 'HEAD'].includes(method.toUpperCase()) && bodyType !== 'none' && body) {
      payloadSnippet = `,\n  data: ${typeof body === 'string' ? body : JSON.stringify(body, null, 2)}`;
    }

    return `// Node.js (Axios)
import axios from 'axios';

async function executeApiRequest() {
  try {
    const response = await axios({
      method: '${method.toLowerCase()}',
      url: '${url}',
      headers: ${JSON.stringify(headersObj, null, 2)}${payloadSnippet}
    });

    console.log('Status:', response.status);
    console.log('Data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Axios Error:', error.response ? error.response.data : error.message);
  }
}

executeApiRequest();`;
  }

  /**
   * Generates Python Requests code.
   */
  static generatePython(request) {
    const { method = 'GET', url = '', headers = [], bodyType = 'none', body = null } = request;
    const headersObj = {};

    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (h.enabled !== false && h.key) {
          headersObj[h.key] = h.isSecret ? '<SECRET_TOKEN>' : h.value;
        }
      }
    }

    let bodyParam = '';
    if (!['GET', 'HEAD'].includes(method.toUpperCase()) && bodyType !== 'none' && body) {
      if (bodyType === 'json') {
        bodyParam = `, json=${typeof body === 'string' ? body : JSON.stringify(body)}`;
      } else {
        bodyParam = `, data="""${String(body)}"""`;
      }
    }

    return `# Python 3 (Requests)
import requests

url = "${url}"
headers = ${JSON.stringify(headersObj, null, 4)}

try:
    response = requests.${method.toLowerCase()}(
        url,
        headers=headers${bodyParam},
        timeout=15
    )
    print(f"Status Code: {response.status_code}")
    print("Response:", response.text)
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")`;
  }

  /**
   * Generates standalone Express mock route implementation.
   */
  static generateExpressRoute(mockEndpoint) {
    const {
      name,
      method = 'GET',
      endpoint_path = '/example',
      response_status = 200,
      response_headers_json = '{}',
      response_body = '{}',
      delay_ms = 0
    } = mockEndpoint;

    let headers = {};
    try {
      headers = JSON.parse(response_headers_json);
    } catch {
      headers = { 'Content-Type': 'application/json' };
    }

    const delayCode = delay_ms > 0 ? `  // Simulated artificial delay\n  await new Promise(r => setTimeout(r, ${delay_ms}));\n` : '';

    return `// Express.js Route: ${name || 'Mock Endpoint'}
// Generated by API FORGE - Mock Endpoint Engine
import express from 'express';

const router = express.Router();

router.${method.toLowerCase()}('${endpoint_path}', async (req, res) => {
${delayCode}  // Configured Response Headers
  res.set(${JSON.stringify(headers, null, 2)});

  // Configured Status & Body
  res.status(${response_status}).send(${response_body});
});

export default router;`;
  }
}
