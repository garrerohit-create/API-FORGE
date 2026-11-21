import { getDatabase } from '../database/connection.js';
import { secretStore } from '../security/secretStore.js';

export class EnvironmentResolutionError extends Error {
  constructor(message, code = 'VARIABLE_RESOLUTION_ERROR') {
    super(message);
    this.name = 'EnvironmentResolutionError';
    this.code = code;
  }
}

/**
 * Loads all active variables for an environment (merging DB values and process memory secrets).
 */
export function getEnvironmentVariablesMap(environmentId, customDb = null) {
  if (!environmentId) return {};

  const db = customDb || getDatabase();
  const rows = db.prepare(`
    SELECT variable_key, variable_value, is_secret, is_enabled
    FROM environment_variables
    WHERE environment_id = ? AND is_enabled = 1
  `).all(environmentId);

  const varMap = {};
  for (const r of rows) {
    if (r.is_secret === 1) {
      // Fetch from in-memory session secret store
      const secretVal = secretStore.getSecret(environmentId, r.variable_key);
      varMap[r.variable_key] = secretVal !== null ? secretVal : '';
    } else {
      varMap[r.variable_key] = r.variable_value ?? '';
    }
  }

  return varMap;
}

/**
 * Interpolates variables in a string template: {{variable_name}}
 * Detects circular references and throws on undefined variables.
 */
export function interpolateString(template, varMap = {}, visited = new Set()) {
  if (template === null || template === undefined || typeof template !== 'string') {
    return template;
  }

  const regex = /\{\{([a-zA-Z0-9_-]+)\}\}/g;
  return template.replace(regex, (match, varName) => {
    if (visited.has(varName)) {
      throw new EnvironmentResolutionError(
        `Circular variable reference detected for variable: "{{${varName}}}"`,
        'CIRCULAR_VARIABLE_REFERENCE'
      );
    }

    if (!(varName in varMap)) {
      throw new EnvironmentResolutionError(
        `Undefined environment variable: "{{${varName}}}". Configure it in the active environment.`,
        'UNDEFINED_VARIABLE'
      );
    }

    const value = String(varMap[varName]);
    
    // Check if the value itself contains nested variables
    if (value.includes('{{')) {
      const nextVisited = new Set(visited);
      nextVisited.add(varName);
      return interpolateString(value, varMap, nextVisited);
    }

    return value;
  });
}

/**
 * Recursively interpolates variables in any object, array, or string.
 */
export function interpolateDeep(data, varMap = {}) {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return interpolateString(data, varMap);
  }

  if (Array.isArray(data)) {
    return data.map((item) => interpolateDeep(item, varMap));
  }

  if (typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[interpolateString(key, varMap)] = interpolateDeep(value, varMap);
    }
    return result;
  }

  return data;
}
