/**
 * Sanitizes URLs, headers, payloads, and error messages to prevent
 * leaking bearer tokens, basic auth credentials, passwords, or session secrets.
 */

const SENSITIVE_KEY_PATTERNS = [
  /bearer\s+[\w\-._~+/]+=*/i,
  /basic\s+[A-Za-z0-9+/=]+/i,
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i
];

/**
 * Redacts secret query parameters from URL for storage in history or logs.
 */
export function sanitizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl);
    // Strip user:password embedded credentials if any
    parsed.username = '';
    parsed.password = '';

    for (const [key] of parsed.searchParams.entries()) {
      if (SENSITIVE_KEY_PATTERNS.some((rx) => rx.test(key))) {
        parsed.searchParams.set(key, '[REDACTED]');
      }
    }
    return parsed.toString();
  } catch {
    // If not a parseable URL, mask potential bearer tokens or keys
    return rawUrl.replace(/([?&][\w-]*(?:token|secret|key|auth|pass)[\w-]*=)[^&]*/gi, '$1[REDACTED]');
  }
}

/**
 * Sanitizes header key-values for logs, history and exports.
 */
export function sanitizeHeaders(headersObj) {
  if (!headersObj || typeof headersObj !== 'object') return {};
  const sanitized = {};

  for (const [key, value] of Object.entries(headersObj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === 'authorization' ||
      lowerKey === 'proxy-authorization' ||
      lowerKey.includes('key') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('cookie')
    ) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Redacts known sensitive strings (such as active secret values) from text.
 */
export function redactKnownSecrets(text, secretValues = []) {
  if (!text || typeof text !== 'string') return text;
  let result = text;
  for (const val of secretValues) {
    if (val && typeof val === 'string' && val.length > 2) {
      result = result.split(val).join('[REDACTED]');
    }
  }
  return result;
}
