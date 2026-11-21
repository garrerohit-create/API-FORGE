import { getDatabase } from '../database/connection.js';
import { config } from '../config/index.js';

/**
 * Generates OpenAPI 3.0 specification and Markdown documentation
 * for workspace mock endpoints and demonstration student CRUD endpoints.
 */
export class DocumentationService {
  static generateOpenApiSpec(workspaceId) {
    const db = getDatabase();
    const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspaceId);
    if (!ws) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const mockEndpoints = db.prepare(`
      SELECT * FROM mock_endpoints WHERE workspace_id = ? AND is_enabled = 1
    `).all(workspaceId);

    const serverUrl = `http://${config.host}:${config.port}`;

    const spec = {
      openapi: '3.0.3',
      info: {
        title: `${ws.name} — API Documentation`,
        version: '1.0.0',
        description: ws.description || 'Auto-generated API specification from API FORGE',
        contact: {
          name: 'API FORGE Engineering'
        }
      },
      servers: [
        {
          url: serverUrl,
          description: 'Local API FORGE Server'
        }
      ],
      paths: {}
    };

    // 1. Add Demonstration Student Management endpoints if this is demo workspace
    if (ws.slug === 'demo' || ws.id === 'ws-demo-lab') {
      spec.paths['/demo/v1/students'] = {
        get: {
          summary: 'Get All Students',
          description: 'Retrieves a paginated list of students with optional department filter.',
          tags: ['Student Management'],
          parameters: [
            { name: 'department', in: 'query', schema: { type: 'string' }, required: false },
            { name: 'search', in: 'query', schema: { type: 'string' }, required: false },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
          ],
          responses: {
            '200': {
              description: 'Successful retrieval',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: [
                      { id: 1, name: 'Alice Johnson', email: 'alice.johnson@university.edu', department: 'Computer Science', year: 3 }
                    ]
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create Student',
          description: 'Creates a new student record with unique email validation.',
          tags: ['Student Management'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'department', 'year'],
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    department: { type: 'string' },
                    year: { type: 'integer', minimum: 1, maximum: 5 }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Student created successfully' },
            '400': { description: 'Validation error' },
            '409': { description: 'Email already exists' }
          }
        }
      };

      spec.paths['/demo/v1/students/{id}'] = {
        get: {
          summary: 'Get Student by ID',
          tags: ['Student Management'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Student details' },
            '404': { description: 'Student not found' }
          }
        },
        put: {
          summary: 'Replace Student',
          tags: ['Student Management'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Student replaced successfully' },
            '404': { description: 'Student not found' },
            '409': { description: 'Email conflict' }
          }
        },
        patch: {
          summary: 'Update Student Department or Details',
          tags: ['Student Management'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Student updated successfully' },
            '404': { description: 'Student not found' }
          }
        },
        delete: {
          summary: 'Delete Student',
          tags: ['Student Management'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '204': { description: 'Student removed successfully' },
            '404': { description: 'Student not found' }
          }
        }
      };
    }

    // 2. Add Configured Mock Endpoints
    for (const ep of mockEndpoints) {
      const fullPath = `/mock/${ws.slug}${ep.endpoint_path}`;
      if (!spec.paths[fullPath]) {
        spec.paths[fullPath] = {};
      }

      let parsedBody = {};
      try {
        parsedBody = JSON.parse(ep.response_body);
      } catch {
        parsedBody = ep.response_body;
      }

      spec.paths[fullPath][ep.method.toLowerCase()] = {
        summary: ep.name,
        description: ep.description || `Mock endpoint returning HTTP ${ep.response_status}`,
        tags: ['Mock Services'],
        responses: {
          [String(ep.response_status)]: {
            description: `Mock response (simulated ${ep.delay_ms}ms delay)`,
            content: {
              [ep.content_type || 'application/json']: {
                example: parsedBody
              }
            }
          }
        }
      };
    }

    return spec;
  }

  static generateMarkdown(workspaceId) {
    const spec = this.generateOpenApiSpec(workspaceId);
    const lines = [
      `# ${spec.info.title}`,
      `> ${spec.info.description}`,
      '',
      `**Base URL:** \`${spec.servers[0].url}\``,
      '',
      '## Endpoints Table',
      '| Method | Path | Summary | Expected Status |',
      '| :--- | :--- | :--- | :--- |'
    ];

    for (const [pathKey, methods] of Object.entries(spec.paths)) {
      for (const [methodKey, details] of Object.entries(methods)) {
        const statuses = Object.keys(details.responses || {}).join(', ');
        lines.push(`| **${methodKey.toUpperCase()}** | \`${pathKey}\` | ${details.summary || ''} | \`${statuses}\` |`);
      }
    }

    lines.push('', '---', '## Endpoint Details');

    for (const [pathKey, methods] of Object.entries(spec.paths)) {
      for (const [methodKey, details] of Object.entries(methods)) {
        lines.push(
          '',
          `### ${methodKey.toUpperCase()} ${pathKey}`,
          `**Summary:** ${details.summary || 'None'}`,
          `**Description:** ${details.description || 'None'}`
        );

        if (details.responses) {
          lines.push('', '**Responses:**');
          for (const [statusCode, resData] of Object.entries(details.responses)) {
            lines.push(`- **${statusCode}**: ${resData.description}`);
            const content = resData.content?.['application/json'];
            if (content?.example) {
              lines.push('```json', JSON.stringify(content.example, null, 2), '```');
            }
          }
        }
      }
    }

    return lines.join('\n');
  }
}
