/**
 * Pure declarative assertion engine for API FORGE.
 * Evaluates assertions against actual HTTP responses.
 * Completely safe: NO eval(), Function(), or executable scripts are ever used.
 */

/**
 * Resolves a safe dot-path or bracket index path in a JSON object.
 * E.g. 'data.students[0].name' or 'students.0.name' or 'success'
 */
export function getByPath(obj, pathStr) {
  if (obj === null || obj === undefined || !pathStr) return undefined;
  
  // Normalize bracket notation: data[0].name -> data.0.name
  const normalized = String(pathStr)
    .replace(/\[(\w+)\]/g, '.$1')
    .replace(/^\./, '');
  
  const parts = normalized.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    // Prevent prototype pollution traversal
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Parses expected value in a type-aware manner.
 * '101' -> 101, 'true' -> true, 'false' -> false, 'null' -> null, '"abc"' -> 'abc'
 */
export function parseExpectedValue(val) {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;

  // Number check (must not be empty, must be valid number)
  if (trimmed !== '' && !isNaN(Number(trimmed)) && !trimmed.startsWith('0x')) {
    return Number(trimmed);
  }

  // Quoted string check: "hello" -> hello
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Attempt JSON parse for objects/arrays
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

/**
 * Evaluates a single assertion against a response.
 * response: { status, headers, body, rawBody, durationMs, sizeBytes }
 */
export function evaluateAssertion(assertion, response) {
  const { name, assertion_type, assertion_target, expected_value_json } = assertion;
  const expectedParsed = parseExpectedValue(expected_value_json);

  const result = {
    test_case_id: assertion.id || null,
    assertion_name_snapshot: name || `${assertion_type} check`,
    result_status: 'failed',
    expected_value_sanitized: String(expected_value_json ?? ''),
    actual_value_sanitized: '',
    failure_message_sanitized: null
  };

  try {
    let parsedBody = null;
    let isJson = false;
    if (response.body && typeof response.body === 'object') {
      parsedBody = response.body;
      isJson = true;
    } else if (typeof response.rawBody === 'string') {
      try {
        parsedBody = JSON.parse(response.rawBody);
        isJson = true;
      } catch {
        isJson = false;
      }
    }

    switch (assertion_type) {
      // 1. Status Assertions
      case 'status_equals': {
        const expectedStatus = Number(expectedParsed);
        result.actual_value_sanitized = String(response.status);
        if (response.status === expectedStatus) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Expected status code ${expectedStatus}, but received ${response.status}.`;
        }
        break;
      }

      case 'status_category': {
        const cat = String(expectedParsed).toLowerCase(); // '2xx', '3xx', '4xx', '5xx'
        result.actual_value_sanitized = `${response.status} (${Math.floor(response.status / 100)}xx)`;
        const expectedPrefix = cat.replace('xx', '');
        const actualPrefix = String(Math.floor(response.status / 100));
        if (actualPrefix === expectedPrefix) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Expected status in category ${cat}, but received ${response.status}.`;
        }
        break;
      }

      case 'status_range': {
        // e.g. "200-299"
        const [minStr, maxStr] = String(expectedParsed).split('-');
        const min = Number(minStr);
        const max = Number(maxStr);
        result.actual_value_sanitized = String(response.status);
        if (response.status >= min && response.status <= max) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Expected status within range ${min}-${max}, but received ${response.status}.`;
        }
        break;
      }

      // 2. Performance Assertions
      case 'time_below': {
        const threshold = Number(expectedParsed);
        result.actual_value_sanitized = `${response.durationMs.toFixed(1)}ms`;
        if (response.durationMs < threshold) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Response time ${response.durationMs.toFixed(1)}ms exceeded threshold of ${threshold}ms.`;
        }
        break;
      }

      case 'time_at_or_below': {
        const threshold = Number(expectedParsed);
        result.actual_value_sanitized = `${response.durationMs.toFixed(1)}ms`;
        if (response.durationMs <= threshold) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Response time ${response.durationMs.toFixed(1)}ms was higher than allowed ${threshold}ms.`;
        }
        break;
      }

      case 'size_below': {
        const threshold = Number(expectedParsed);
        result.actual_value_sanitized = `${response.sizeBytes} bytes`;
        if (response.sizeBytes < threshold) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Response size ${response.sizeBytes} bytes exceeded limit of ${threshold} bytes.`;
        }
        break;
      }

      // 3. Header Assertions
      case 'header_exists': {
        const headerName = (assertion_target || '').toLowerCase();
        const headerVal = response.headers ? response.headers[headerName] : undefined;
        result.actual_value_sanitized = headerVal !== undefined ? 'present' : 'missing';
        if (headerVal !== undefined) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Expected header "${headerName}" was not present in response.`;
        }
        break;
      }

      case 'header_equals': {
        const headerName = (assertion_target || '').toLowerCase();
        const headerVal = response.headers ? response.headers[headerName] : '';
        result.actual_value_sanitized = String(headerVal);
        if (String(headerVal).toLowerCase() === String(expectedParsed).toLowerCase()) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Expected header "${headerName}" to equal "${expectedParsed}", got "${headerVal}".`;
        }
        break;
      }

      case 'header_contains': {
        const headerName = (assertion_target || '').toLowerCase();
        const headerVal = response.headers ? response.headers[headerName] : '';
        result.actual_value_sanitized = String(headerVal);
        if (String(headerVal).toLowerCase().includes(String(expectedParsed).toLowerCase())) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Expected header "${headerName}" to contain "${expectedParsed}", got "${headerVal}".`;
        }
        break;
      }

      // 4. JSON Assertions
      case 'json_valid': {
        result.actual_value_sanitized = isJson ? 'valid JSON' : 'invalid / non-JSON';
        if (isJson) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = 'Response body is not valid JSON.';
        }
        break;
      }

      case 'json_property_exists': {
        if (!isJson) {
          result.actual_value_sanitized = 'non-JSON response';
          result.failure_message_sanitized = 'Cannot check property on non-JSON response.';
          break;
        }
        const val = getByPath(parsedBody, assertion_target);
        result.actual_value_sanitized = val !== undefined ? 'present' : 'undefined';
        if (val !== undefined) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Property "${assertion_target}" was not found in response JSON.`;
        }
        break;
      }

      case 'json_property_equals': {
        if (!isJson) {
          result.actual_value_sanitized = 'non-JSON response';
          result.failure_message_sanitized = 'Cannot evaluate property on non-JSON response.';
          break;
        }
        const val = getByPath(parsedBody, assertion_target);
        result.actual_value_sanitized = JSON.stringify(val);
        // Type-aware strict equality check
        if (JSON.stringify(val) === JSON.stringify(expectedParsed)) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Property "${assertion_target}" expected ${JSON.stringify(expectedParsed)}, received ${JSON.stringify(val)}.`;
        }
        break;
      }

      case 'json_property_not_equals': {
        if (!isJson) {
          result.actual_value_sanitized = 'non-JSON response';
          result.failure_message_sanitized = 'Cannot evaluate property on non-JSON response.';
          break;
        }
        const val = getByPath(parsedBody, assertion_target);
        result.actual_value_sanitized = JSON.stringify(val);
        if (JSON.stringify(val) !== JSON.stringify(expectedParsed)) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Property "${assertion_target}" unexpectedly equaled ${JSON.stringify(expectedParsed)}.`;
        }
        break;
      }

      case 'json_property_type': {
        if (!isJson) {
          result.actual_value_sanitized = 'non-JSON response';
          result.failure_message_sanitized = 'Cannot evaluate property type on non-JSON response.';
          break;
        }
        const val = getByPath(parsedBody, assertion_target);
        let actualType = typeof val;
        if (val === null) actualType = 'null';
        else if (Array.isArray(val)) actualType = 'array';
        
        result.actual_value_sanitized = actualType;
        const expectedType = String(expectedParsed).toLowerCase();
        if (actualType === expectedType) {
          result.result_status = 'passed';
        } else {
          result.failure_message_sanitized = `Property "${assertion_target}" expected type "${expectedType}", received "${actualType}".`;
        }
        break;
      }

      case 'json_array_length': {
        if (!isJson) {
          result.actual_value_sanitized = 'non-JSON response';
          result.failure_message_sanitized = 'Cannot evaluate array length on non-JSON response.';
          break;
        }
        const val = assertion_target ? getByPath(parsedBody, assertion_target) : parsedBody;
        if (!Array.isArray(val)) {
          result.actual_value_sanitized = typeof val;
          result.failure_message_sanitized = `Target "${assertion_target || 'root'}" is not an array.`;
        } else {
          result.actual_value_sanitized = String(val.length);
          const expectedLen = Number(expectedParsed);
          if (val.length === expectedLen) {
            result.result_status = 'passed';
          } else {
            result.failure_message_sanitized = `Array length was ${val.length}, expected ${expectedLen}.`;
          }
        }
        break;
      }

      case 'json_array_length_gt': {
        if (!isJson) {
          result.actual_value_sanitized = 'non-JSON response';
          result.failure_message_sanitized = 'Cannot evaluate array length on non-JSON response.';
          break;
        }
        const val = assertion_target ? getByPath(parsedBody, assertion_target) : parsedBody;
        if (!Array.isArray(val)) {
          result.actual_value_sanitized = typeof val;
          result.failure_message_sanitized = `Target "${assertion_target || 'root'}" is not an array.`;
        } else {
          result.actual_value_sanitized = String(val.length);
          const threshold = Number(expectedParsed);
          if (val.length > threshold) {
            result.result_status = 'passed';
          } else {
            result.failure_message_sanitized = `Array length ${val.length} is not greater than ${threshold}.`;
          }
        }
        break;
      }

      default:
        result.failure_message_sanitized = `Unsupported assertion type: "${assertion_type}"`;
        result.result_status = 'error';
    }
  } catch (err) {
    result.result_status = 'error';
    result.failure_message_sanitized = `Assertion execution error: ${err.message}`;
  }

  return result;
}

/**
 * Runs a list of assertions against a response.
 */
export function evaluateAllAssertions(assertions = [], response) {
  if (!Array.isArray(assertions) || assertions.length === 0) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      results: []
    };
  }

  const results = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const assertion of assertions) {
    if (assertion.is_enabled === 0 || assertion.is_enabled === false) {
      skipped++;
      results.push({
        test_case_id: assertion.id || null,
        assertion_name_snapshot: assertion.name || 'Disabled test',
        result_status: 'skipped',
        expected_value_sanitized: String(assertion.expected_value_json ?? ''),
        actual_value_sanitized: 'Skipped',
        failure_message_sanitized: null
      });
      continue;
    }

    const res = evaluateAssertion(assertion, response);
    if (res.result_status === 'passed') {
      passed++;
    } else {
      failed++;
    }
    results.push(res);
  }

  return {
    total: assertions.length,
    passed,
    failed,
    skipped,
    results
  };
}
