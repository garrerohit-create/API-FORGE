import { describe, it, expect } from 'vitest';
import {
  validateDestinationUrl,
  checkIpAddressIsPublic,
  DestinationValidationError
} from '../src/security/ssrfValidator.js';

describe('SSRF Protection & Outbound Destination Validator', () => {
  it('allows valid local mock and demo endpoints on the server port', async () => {
    const res1 = await validateDestinationUrl('http://127.0.0.1:5000/mock/demo/users');
    expect(res1.isValid).toBe(true);
    expect(res1.isLocal).toBe(true);

    const res2 = await validateDestinationUrl('http://localhost:5000/demo/v1/students');
    expect(res2.isValid).toBe(true);
    expect(res2.isLocal).toBe(true);
  });

  it('rejects unsupported protocols (file, ftp, gopher, data)', async () => {
    await expect(validateDestinationUrl('file:///etc/passwd')).rejects.toThrowError(
      /Unsupported protocol "file:"/
    );
    await expect(validateDestinationUrl('ftp://example.com/file')).rejects.toThrowError(
      /Unsupported protocol "ftp:"/
    );
    await expect(validateDestinationUrl('gopher://example.com')).rejects.toThrowError(
      /Unsupported protocol "gopher:"/
    );
  });

  it('rejects URLs containing embedded credentials', async () => {
    await expect(validateDestinationUrl('http://admin:secret@127.0.0.1:5000/mock/demo/users')).rejects.toThrowError(
      /embedded user credentials/
    );
  });

  it('rejects recursive calls to API FORGE management API', async () => {
    await expect(validateDestinationUrl('http://127.0.0.1:5000/api/v1/workspaces')).rejects.toThrowError(
      /Recursive requests to the API FORGE management API/
    );
  });

  it('rejects unauthorized loopback ports', async () => {
    await expect(validateDestinationUrl('http://127.0.0.1:3306/mysql')).rejects.toThrowError(
      /Access to local port 3306 is restricted/
    );
    await expect(validateDestinationUrl('http://localhost:8080/admin')).rejects.toThrowError(
      /Access to local port 8080 is restricted/
    );
  });

  it('rejects external calls when local demonstration mode is active', async () => {
    await expect(
      validateDestinationUrl('https://api.github.com/users', { allowPublicApiRequests: false })
    ).rejects.toThrowError(/Local Demonstration Mode is active/);
  });

  it('blocks private IP addresses and cloud metadata in IP classifier', () => {
    expect(() => checkIpAddressIsPublic('169.254.169.254', 'metadata')).toThrowError(
      /cloud metadata services/
    );
    expect(() => checkIpAddressIsPublic('10.0.0.1', 'internal')).toThrowError(/restricted IP/);
    expect(() => checkIpAddressIsPublic('192.168.1.100', 'lan')).toThrowError(/restricted IP/);
    expect(() => checkIpAddressIsPublic('172.16.0.5', 'private')).toThrowError(/restricted IP/);
    expect(() => checkIpAddressIsPublic('127.0.0.1', 'loopback')).toThrowError(/restricted IP/);
    expect(() => checkIpAddressIsPublic('::ffff:127.0.0.1', 'mapped-loopback')).toThrowError(/restricted IP/);
  });

  it('permits public IP addresses in IP classifier', () => {
    expect(checkIpAddressIsPublic('8.8.8.8', 'dns.google')).toBe(true);
    expect(checkIpAddressIsPublic('1.1.1.1', 'one.one.one.one')).toBe(true);
  });
});
