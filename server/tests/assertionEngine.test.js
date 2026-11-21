import { describe, it, expect } from 'vitest';
import {
  evaluateAssertion,
  evaluateAllAssertions,
  getByPath,
  parseExpectedValue
} from '../src/services/assertionEngine.js';

describe('Declarative Assertion Engine', () => {
  const sampleResponse = {
    status: 200,
    durationMs: 45.2,
    sizeBytes: 312,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-powered-by': 'API-FORGE'
    },
    body: {
      success: true,
      code: 101,
      tag: 'production',
      data: {
        students: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]
      }
    },
    rawBody: JSON.stringify({ success: true, count: 2 })
  };

  it('resolves safe JSON paths and bracket indices', () => {
    expect(getByPath(sampleResponse.body, 'success')).toBe(true);
    expect(getByPath(sampleResponse.body, 'data.students[0].name')).toBe('Alice');
    expect(getByPath(sampleResponse.body, 'data.students.1.id')).toBe(2);
    expect(getByPath(sampleResponse.body, 'non.existent.path')).toBeUndefined();
    // Protect against prototype pollution
    expect(getByPath(sampleResponse.body, '__proto__.polluted')).toBeUndefined();
  });

  it('parses expected values with strict types', () => {
    expect(parseExpectedValue('200')).toBe(200);
    expect(parseExpectedValue('true')).toBe(true);
    expect(parseExpectedValue('false')).toBe(false);
    expect(parseExpectedValue('null')).toBe(null);
    expect(parseExpectedValue('"101"')).toBe('101');
    expect(parseExpectedValue('plain text')).toBe('plain text');
  });

  it('evaluates status assertions (equals, category, range)', () => {
    const eqPass = evaluateAssertion({ assertion_type: 'status_equals', expected_value_json: '200' }, sampleResponse);
    expect(eqPass.result_status).toBe('passed');

    const eqFail = evaluateAssertion({ assertion_type: 'status_equals', expected_value_json: '404' }, sampleResponse);
    expect(eqFail.result_status).toBe('failed');
    expect(eqFail.failure_message_sanitized).toContain('Expected status code 404, but received 200');

    const catPass = evaluateAssertion({ assertion_type: 'status_category', expected_value_json: '2xx' }, sampleResponse);
    expect(catPass.result_status).toBe('passed');

    const rangePass = evaluateAssertion({ assertion_type: 'status_range', expected_value_json: '200-299' }, sampleResponse);
    expect(rangePass.result_status).toBe('passed');
  });

  it('evaluates latency & size assertions', () => {
    const timePass = evaluateAssertion({ assertion_type: 'time_below', expected_value_json: '100' }, sampleResponse);
    expect(timePass.result_status).toBe('passed');

    const timeFail = evaluateAssertion({ assertion_type: 'time_below', expected_value_json: '30' }, sampleResponse);
    expect(timeFail.result_status).toBe('failed');

    const sizePass = evaluateAssertion({ assertion_type: 'size_below', expected_value_json: '1000' }, sampleResponse);
    expect(sizePass.result_status).toBe('passed');
  });

  it('evaluates header assertions', () => {
    const existsPass = evaluateAssertion({ assertion_type: 'header_exists', assertion_target: 'content-type' }, sampleResponse);
    expect(existsPass.result_status).toBe('passed');

    const containsPass = evaluateAssertion(
      { assertion_type: 'header_contains', assertion_target: 'content-type', expected_value_json: 'application/json' },
      sampleResponse
    );
    expect(containsPass.result_status).toBe('passed');
  });

  it('evaluates JSON property existence, equality, and types', () => {
    const propPass = evaluateAssertion(
      { assertion_type: 'json_property_equals', assertion_target: 'success', expected_value_json: 'true' },
      sampleResponse
    );
    expect(propPass.result_status).toBe('passed');

    const typePass = evaluateAssertion(
      { assertion_type: 'json_property_type', assertion_target: 'data.students', expected_value_json: 'array' },
      sampleResponse
    );
    expect(typePass.result_status).toBe('passed');

    const lenPass = evaluateAssertion(
      { assertion_type: 'json_array_length', assertion_target: 'data.students', expected_value_json: '2' },
      sampleResponse
    );
    expect(lenPass.result_status).toBe('passed');
  });

  it('aggregates multiple assertions in evaluateAllAssertions', () => {
    const list = [
      { name: 'Check 200', assertion_type: 'status_equals', expected_value_json: '200', is_enabled: 1 },
      { name: 'Check Time', assertion_type: 'time_below', expected_value_json: '1000', is_enabled: 1 },
      { name: 'Disabled Check', assertion_type: 'status_equals', expected_value_json: '500', is_enabled: 0 }
    ];

    const summary = evaluateAllAssertions(list, sampleResponse);
    expect(summary.total).toBe(3);
    expect(summary.passed).toBe(2);
    expect(summary.failed).toBe(0);
    expect(summary.skipped).toBe(1);
  });
});
