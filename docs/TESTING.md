# API FORGE — Testing & Verification Strategy

## 1. Testing Philosophy

In API FORGE, automated testing is a mandatory engineering practice. No feature is marked complete without automated verification.

The testing strategy spans four distinct levels:
1. **Unit Testing**: Isolated verification of pure functions (assertion evaluation, environment interpolation, IP classification, code generation).
2. **Backend Integration Testing**: Real HTTP communication with Express endpoints and transactional in-memory SQLite instances.
3. **Security Testing**: Verification of SSRF defenses, loopback port isolation, cloud metadata blocking, and secret redaction.
4. **End-to-End Acceptance Testing**: Full workflow verification covering all 17 mandatory acceptance scenarios against a running server.

---

## 2. Test Execution Commands

### Run Vitest Unit & Integration Tests:
```bash
npm test
```

### Run Full End-to-End Acceptance Verification:
```bash
npm run test:e2e
```

### Run Code Hygiene & Lint Checks:
```bash
npm run lint
npm run format
```

---

## 3. Verified Test Suites Breakdown

| Test Suite File | Type | Tests | Status | Key Coverage |
| :--- | :--- | :--- | :--- | :--- |
| `tests/ssrfSecurity.test.js` | Security | 8 | PASSED | Protocol checks, loopback port bounds, cloud metadata, private IP ranges |
| `tests/assertionEngine.test.js` | Unit | 7 | PASSED | Status checks, latency thresholds, headers, JSON path traversal, types |
| `tests/environmentResolution.test.js` | Unit | 4 | PASSED | `{{var}}` interpolation, nested variables, circular reference detection, missing vars |
| `tests/importExport.test.js` | Integration | 4 | PASSED | Native collection export/import, Postman v2.1 import, script sanitization |
| `tests/studentApi.test.js` | Integration | 8 | PASSED | Health check, Student CRUD (200, 201, 204, 404, 409 email conflict) |
| `tests/mockEngine.test.js` | Integration | 5 | PASSED | Dynamic dispatch, custom headers, 201/401/404 responses, mock service killswitch |
| **Total Automated Tests** | | **36** | **36/36 PASSED** | |

---

## 4. End-to-End Acceptance Scenarios (17/17 Verified)

API FORGE includes a dedicated acceptance runner script (`scripts/run-e2e.js`) that boots an actual HTTP server and tests all 17 mandatory scenarios from section 42 of the project specification:

1. **Scenario 1 — Mock API Creation & Execution**: GET mock created and returns configured payload with 200 OK.
2. **Scenario 2 — Dynamic Update**: Mock payload updated in database and verified immediately without restarting server.
3. **Scenario 3 — Endpoint Disabling**: Endpoint disabled; returns 404.
4. **Scenario 4 — Real CRUD Functionality**: Student created (201), read (200), updated (200), deleted (204), and verified absent (404).
5. **Scenario 5 — Automated Test Success**: Assertions evaluate against real responses and pass.
6. **Scenario 6 — Automated Test Failure**: Intentionally false assertion fails and outputs expected vs actual values.
7. **Scenario 7 — Request Timeout**: Request with 50ms timeout against 250ms delayed endpoint cleanly reports timeout.
8. **Scenario 8 — Collection Persistence**: Collections and requests survive in SQLite database.
9. **Scenario 9 — Environment Variables**: Variables like `{{base_url}}` resolve to actual destinations.
10. **Scenario 10 — Secret Handling**: Session secrets reside in process memory and never leak to SQLite disk.
11. **Scenario 11 — Real Analytics**: Telemetry metrics calculated from actual recorded execution records.
12. **Scenario 12 — Import & Export**: Collection exported to native format and re-imported with fresh IDs.
13. **Scenario 13 — Invalid Import Rejection**: Corrupted JSON rejected with error, protecting database integrity.
14. **Scenario 14 — Backend Health**: Live health endpoint ping returns healthy and operational database status.
15. **Scenario 15 — Outbound SSRF Protection**: Requests to cloud metadata (169.254.169.254) and forbidden loopback ports are rejected.
16. **Scenario 16 — Interface Integrity**: Production client served through Express with SPA fallback.
17. **Scenario 17 — Offline Operation**: Complete suite executes without internet connection.
