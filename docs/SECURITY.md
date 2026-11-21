# API FORGE — Security Architecture & Threat Model

## 1. Security Overview

Because API FORGE is capable of executing arbitrary user-defined HTTP requests, request execution security is a foundational requirement.

The security architecture focuses on four critical domains:
1. **Server-Side Request Forgery (SSRF) Prevention**
2. **Resource Exhaustion Defense (DoS / OOM Prevention)**
3. **Sensitive Credential Isolation & Masking**
4. **Local Host and Origin Isolation**

---

## 2. Server-Side Request Forgery (SSRF) Safeguards

API FORGE operates in two distinct execution modes:

### 2.1 Local Demonstration Mode (Default)
In Local Demonstration Mode (`ALLOW_PUBLIC_API_REQUESTS=false`):
- **Permitted Destinations**: Only loopback addresses (`127.0.0.1`, `localhost`, `::1`) matching the configured server port (`5000`) for paths starting with `/mock/...` or `/demo/...`.
- **Recursive Management Blocking**: Outbound calls to `/api/v1/...` (the management API) are strictly blocked with `RECURSIVE_MANAGEMENT_CALL_FORBIDDEN` to prevent circular request bombs.
- **Port Isolation**: Requests to arbitrary loopback ports (e.g., local database ports `3306`, `5432`, `27017` or web services `8080`) are rejected with `FORBIDDEN_LOOPBACK_PORT`.
- **Protocol Restrictions**: Only `http:` and `https:` protocols are permitted. `file:`, `ftp:`, `gopher:`, `data:`, and embedded user credentials (`http://user:pass@host`) are blocked.

### 2.2 Public API Mode (Explicit Opt-In)
When explicitly enabled (`ALLOW_PUBLIC_API_REQUESTS=true`):
- The hostname is parsed using `new URL()`.
- Hostnames are resolved to IP addresses using `dns.promises.lookup()`.
- Every resolved IP is evaluated using `ipaddr.js` to block:
  - Loopback (`127.0.0.0/8`, `::1`)
  - Private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
  - Link-local addresses (`169.254.0.0/16`, `fe80::/10`)
  - Cloud metadata endpoints (`169.254.169.254`)
  - Carrier-grade NAT (`100.64.0.0/10`)
  - Multicast (`224.0.0.0/4`), broadcast (`255.255.255.255`), and reserved ranges (`0.0.0.0/8`, `240.0.0.0/4`)
  - IPv4-mapped IPv6 representations (e.g. `::ffff:127.0.0.1`)

---

## 3. Resource Exhaustion & Payload Controls

- **Request Payload Limit**: Inbound and outbound request payloads are capped at 1 MiB (`1,048,576` bytes).
- **Response Size Limit**: Inbound response bodies are streamed and monitored chunk by chunk. If received bytes exceed 5 MiB (`5,242,880` bytes), the connection is aborted immediately (`ERESPONSE_TOO_LARGE`).
- **Bounded Request Timeout**: Request timeouts are enforced via `AbortController`. The default timeout is 15 seconds; server-enforced maximum is 60 seconds.
- **Collection Runner Limits**: Sequential collection runs are bounded to a maximum of 3 iterations per run.

---

## 4. Sensitive Credential Isolation

- **In-Memory Secret Store**: Environment variables marked as `is_secret = 1` have their values stored exclusively in Node.js process memory (`secretStore.js`).
- **Zero Disk Leakage**: Secret values are never saved to SQLite, browser `localStorage`, server log files, or exported JSON collections.
- **Header & URL Redaction**: Outbound authorization headers (`Bearer ...`, `Basic ...`), API keys, and sensitive URL query parameters are automatically redacted before logging into `request_history`.

---

## 5. Host & Browser Origin Isolation

- **Loopback Server Binding**: The HTTP server binds exclusively to `127.0.0.1`.
- **Strict Helmet CSP**: Content Security Policy allows only local assets and disables external script execution.
- **Restricted CORS**: Cross-origin requests are permitted only from the configured local client development proxy (`localhost:5173`, `localhost:5000`).
- **Content-Type Enforcement**: Management write operations (`POST`, `PUT`, `PATCH` on `/api/v1`) reject non-JSON payloads (`415 Unsupported Media Type`) to protect against unauthorized form submissions.
