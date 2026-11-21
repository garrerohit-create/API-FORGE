import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import { config } from '../config/index.js';

export class DestinationValidationError extends Error {
  constructor(message, code = 'FORBIDDEN_DESTINATION') {
    super(message);
    this.name = 'DestinationValidationError';
    this.code = code;
  }
}

/**
 * Validates destination URLs against strict SSRF policies.
 * In Local Demo Mode (default):
 *   Only allows requests to the local server's port for /mock/... or /demo/...
 *   Blocks calls to management API /api/v1/...
 *   Blocks arbitrary local ports or external destinations.
 * In Public API Mode (when explicitly enabled):
 *   Allows public HTTP/HTTPS destinations.
 *   Validates DNS resolution, rejecting private, loopback, link-local, multicast,
 *   cloud metadata (169.254.169.254), and IPv4-mapped IPv6 ranges.
 */
export async function validateDestinationUrl(rawUrl, options = {}) {
  const allowPublic = options.allowPublicApiRequests ?? config.allowPublicApiRequests;
  const serverPort = config.port;

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new DestinationValidationError(`Invalid URL: "${rawUrl}"`, 'INVALID_URL');
  }

  // 1. Protocol check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new DestinationValidationError(
      `Unsupported protocol "${parsed.protocol}". Only http: and https: are permitted.`,
      'UNSUPPORTED_PROTOCOL'
    );
  }

  // 2. Disallow embedded credentials
  if (parsed.username || parsed.password) {
    throw new DestinationValidationError(
      'URLs containing embedded user credentials (user:pass@host) are forbidden.',
      'EMBEDDED_CREDENTIALS_FORBIDDEN'
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80);
  const pathname = parsed.pathname;

  // 3. Local Loopback Handling
  const isLoopbackHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost');

  if (isLoopbackHost) {
    // Only allow calling the server's own port
    if (port !== serverPort) {
      throw new DestinationValidationError(
        `Access to local port ${port} is restricted. Only the API FORGE port (${serverPort}) is allowed for local mock/demo endpoints.`,
        'FORBIDDEN_LOOPBACK_PORT'
      );
    }

    // Disallow recursive calls to management API
    if (pathname.startsWith('/api/v1')) {
      throw new DestinationValidationError(
        'Recursive requests to the API FORGE management API (/api/v1) are strictly prohibited.',
        'RECURSIVE_MANAGEMENT_CALL_FORBIDDEN'
      );
    }

    // Allow mock and demo endpoints
    if (pathname.startsWith('/mock/') || pathname.startsWith('/demo/')) {
      return {
        isValid: true,
        isLocal: true,
        resolvedIp: '127.0.0.1',
        normalizedUrl: parsed.toString()
      };
    }

    throw new DestinationValidationError(
      `Local destination path "${pathname}" is not allowed. Only /mock/... and /demo/... endpoints are permitted.`,
      'FORBIDDEN_LOCAL_PATH'
    );
  }

  // If not loopback, check if public mode is permitted
  if (!allowPublic) {
    throw new DestinationValidationError(
      `Outbound request to external destination "${hostname}" is blocked. Local Demonstration Mode is active. Enable ALLOW_PUBLIC_API_REQUESTS in settings to execute external requests.`,
      'EXTERNAL_REQUESTS_DISABLED'
    );
  }

  // 4. DNS Resolution and IP Classification for Public Mode
  let resolvedAddresses = [];
  try {
    const lookupResults = await dns.lookup(hostname, { all: true });
    resolvedAddresses = lookupResults.map((r) => r.address);
  } catch (err) {
    throw new DestinationValidationError(
      `DNS lookup failed for host "${hostname}": ${err.message}`,
      'DNS_LOOKUP_FAILED'
    );
  }

  if (!resolvedAddresses.length) {
    throw new DestinationValidationError(
      `Could not resolve any IP address for host "${hostname}".`,
      'DNS_RESOLUTION_EMPTY'
    );
  }

  // Check each resolved IP
  for (const addr of resolvedAddresses) {
    checkIpAddressIsPublic(addr, hostname);
  }

  return {
    isValid: true,
    isLocal: false,
    resolvedIp: resolvedAddresses[0],
    normalizedUrl: parsed.toString()
  };
}

/**
 * Checks an IP address string to ensure it is strictly a public routable address.
 */
export function checkIpAddressIsPublic(ipString, hostname = '') {
  let parsedIp;
  try {
    parsedIp = ipaddr.parse(ipString);
  } catch {
    throw new DestinationValidationError(
      `Invalid IP address representation "${ipString}" for host "${hostname}".`,
      'INVALID_IP'
    );
  }

  // If IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1), unmap it
  if (parsedIp.kind() === 'ipv6' && parsedIp.isIPv4MappedAddress()) {
    parsedIp = parsedIp.toIPv4Address();
  }

  // Cloud metadata endpoint check (169.254.169.254) checked FIRST
  if (ipString === '169.254.169.254' || ipString === '::ffff:169.254.169.254') {
    throw new DestinationValidationError(
      'Access to cloud metadata services is strictly prohibited.',
      'CLOUD_METADATA_FORBIDDEN'
    );
  }

  const range = parsedIp.range();

  // Forbidden ranges:
  // loopback, private, linkLocal, uniqueLocal, carrierGradeNat, multicast, reserved, broadcast, unspecified
  const blockedRanges = [
    'loopback',
    'private',
    'linkLocal',
    'uniqueLocal',
    'carrierGradeNat',
    'multicast',
    'reserved',
    'broadcast',
    'unspecified'
  ];

  if (blockedRanges.includes(range)) {
    throw new DestinationValidationError(
      `Destination "${hostname}" resolved to restricted IP ${ipString} (${range} range). Request blocked by SSRF policy.`,
      'RESTRICTED_IP_RANGE'
    );
  }

  return true;
}
