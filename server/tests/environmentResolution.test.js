import { describe, it, expect } from 'vitest';
import {
  interpolateString,
  interpolateDeep,
  EnvironmentResolutionError
} from '../src/services/environmentResolutionService.js';

describe('Environment Variable Interpolation Service', () => {
  const sampleMap = {
    base_url: 'http://127.0.0.1:5000',
    api_version: 'v1',
    student_id: '42',
    name: 'Neo'
  };

  it('interpolates single and multiple variables in strings', () => {
    const url = '{{base_url}}/demo/{{api_version}}/students/{{student_id}}';
    const resolved = interpolateString(url, sampleMap);
    expect(resolved).toBe('http://127.0.0.1:5000/demo/v1/students/42');
  });

  it('throws an error on undefined variables', () => {
    expect(() => interpolateString('{{base_url}}/{{unknown_var}}', sampleMap)).toThrowError(
      /Undefined environment variable: "{{unknown_var}}"/
    );
  });

  it('detects circular variable references', () => {
    const circularMap = {
      a: '{{b}}',
      b: '{{c}}',
      c: '{{a}}'
    };

    expect(() => interpolateString('{{a}}', circularMap)).toThrowError(
      /Circular variable reference detected/
    );
  });

  it('recursively interpolates objects and arrays', () => {
    const templateObj = {
      endpoint: '{{base_url}}/users',
      payload: {
        id: '{{student_id}}',
        greeting: 'Hello {{name}}'
      },
      tags: ['demo', '{{api_version}}']
    };

    const resolved = interpolateDeep(templateObj, sampleMap);
    expect(resolved.endpoint).toBe('http://127.0.0.1:5000/users');
    expect(resolved.payload.id).toBe('42');
    expect(resolved.payload.greeting).toBe('Hello Neo');
    expect(resolved.tags[1]).toBe('v1');
  });
});
