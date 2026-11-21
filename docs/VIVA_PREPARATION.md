# API FORGE — Viva Voce Preparation Guide (45 Questions & Answers)

This guide prepares students for technical viva voce examinations, code defenses, and architectural reviews by evaluators.

---

## Section 1: Node.js Architecture & Runtime (Questions 1–10)

### Q1: What is Node.js, and how does it execute JavaScript outside the browser?
**Answer:** Node.js is an open-source, cross-platform JavaScript runtime environment built on Google Chrome's V8 JavaScript engine. It executes JavaScript directly on the machine's operating system by compiling JS source code into native machine code. It provides native C++ bindings for system-level operations such as filesystem access (`node:fs`), networking (`node:http`, `node:net`), and cryptography (`node:crypto`).

### Q2: What is the Node.js Event Loop, and how does it handle asynchronous I/O?
**Answer:** The Event Loop is the mechanism that allows Node.js to perform non-blocking I/O operations despite JavaScript being single-threaded. It offloads operations (such as file reading or network requests) to the system kernel or libuv thread pool. The event loop continuously cycles through phases (Timers, Pending Callbacks, Poll, Check, Close) to execute queued callbacks when I/O operations complete.

### Q3: How is non-blocking asynchronous programming achieved in API FORGE?
**Answer:** In API FORGE, outgoing network requests and artificial mock delays do not block the thread. For example, in [`mockDispatchService.js`](file:///server/src/services/mockDispatchService.js), artificial delay is handled using `await new Promise(r => setTimeout(r, delayMs))`. While one request waits, the event loop handles other incoming requests without stalling.

### Q4: What is the difference between synchronous and asynchronous code in Node.js?
**Answer:** Synchronous code executes sequentially on the main thread and halts further execution until the current operation finishes (blocking). Asynchronous code initiates an operation, registers a callback, Promise, or async handler, and immediately returns control to the event loop, allowing subsequent operations to proceed while the first completes in the background.

### Q5: What are Promises and how does `async`/`await` improve upon callbacks?
**Answer:** A Promise represents an eventual completion (or failure) of an asynchronous operation and its resulting value (`pending`, `fulfilled`, `rejected`). `async`/`await` is syntactic sugar over Promises that allows asynchronous code to be written with synchronous-like readability, using standard `try`/`catch` blocks for error propagation and eliminating "callback hell".

### Q6: How does API FORGE use the native Node.js `EventEmitter`?
**Answer:** In [`appEventEmitter.js`](file:///server/src/events/appEventEmitter.js), API FORGE subclasses `node:events` to create an application event bus. It emits events such as `request.started`, `request.completed`, and `mock.called` to decouple secondary logging, audit tracking, and real-time telemetry from core request handling.

### Q7: What are Node.js Buffers and Streams, and where are they used in this project?
**Answer:** A Buffer is an allocated chunk of raw binary memory outside the V8 heap. A Stream is an interface for reading or writing data chunk-by-chunk. In [`requestExecutionService.js`](file:///server/src/services/requestExecutionService.js), API FORGE uses response streams to accumulate data chunk-by-chunk and monitors `receivedBytes`. If the incoming stream exceeds 5MB, it aborts the connection via `clientReq.destroy()` before memory exhaustion occurs.

### Q8: What is `performance.now()` and why is it preferred over `Date.now()` for API latency measurement?
**Answer:** `Date.now()` is subject to system clock synchronization adjustments (NTP drift), which can produce inaccurate or negative elapsed times. `performance.now()` provides high-resolution monotonic timestamps that always advance at a constant rate, ensuring accurate millisecond measurements.

### Q9: How are ES Modules (`import`/`export`) configured in API FORGE?
**Answer:** In both root and child `package.json` files, `"type": "module"` is configured. This allows modern standard ES Module syntax (`import ... from '...'`) across the backend and frontend rather than legacy CommonJS `require()`.

### Q10: How does Node.js 24 handle SQLite natively without external drivers?
**Answer:** Node.js 24 provides built-in SQLite support via the `node:sqlite` module (`DatabaseSync`). It directly integrates SQLite 3 into the Node runtime, enabling fast, zero-dependency embedded database operations with standard SQL syntax and transactions.

---

## Section 2: Express.js & REST API Design (Questions 11–20)

### Q11: What is Express.js, and why is it used in API FORGE?
**Answer:** Express.js is a minimal and flexible Node.js web application framework providing robust features for routing, middleware pipelines, and HTTP request/response handling. It organizes management routes (`/api/v1`), demonstration routes (`/demo/v1`), and dynamic mock dispatching (`/mock`).

### Q12: What is Express middleware, and how does it work?
**Answer:** Middleware functions are functions that have access to the request object (`req`), response object (`res`), and the `next` function in the application’s request-response cycle. They can execute code, modify `req` and `res`, terminate the request, or invoke `next()` to pass control to the subsequent handler.

### Q13: What middlewares are implemented in API FORGE?
**Answer:**
1. `securityHeaders.js`: Helmet for security headers and custom CORS controls.
2. `requestLogger.js`: Logs incoming HTTP methods, URLs, status codes, and execution duration.
3. `validate.js`: Zod-based schema validation for request bodies and parameters.
4. `errorHandler.js`: Centralized error interceptor formatting structured JSON error responses.

### Q14: What is the difference between `PUT` and `PATCH` in REST APIs?
**Answer:** `PUT` replaces the entire resource representation with the supplied payload, requiring all required fields. `PATCH` applies a partial update, modifying only the fields included in the request body while leaving other attributes unchanged. Both are demonstrated in [`studentRoutes.js`](file:///server/src/routes/studentRoutes.js).

### Q15: What HTTP status codes are demonstrated in the Student Management API?
**Answer:**
- `200 OK`: Successful retrieval or update.
- `201 Created`: Successful creation of a new student.
- `204 No Content`: Successful deletion of a student.
- `400 Bad Request`: Validation failure (e.g. missing required student fields).
- `404 Not Found`: Student ID does not exist in the database.
- `409 Conflict`: Attempted creation or update with an already-existing email address.

### Q16: How does API FORGE serve the production frontend alongside the backend?
**Answer:** In [`app.js`](file:///server/src/app.js), Express serves the static build files from `client/dist`. A wildcard route (`app.get('*')`) acts as an SPA fallback serving `index.html` for client-side routing, explicitly bypassing API, mock, and demo routes so backend functionality is never intercepted.

### Q17: What is the difference between URL parameters and query parameters?
**Answer:** URL parameters (`/students/:id`) identify a specific resource by its path identifier. Query parameters (`/students?department=CSE&page=1`) filter, sort, or paginate the collection without altering the underlying resource path.

### Q18: How does API FORGE implement dynamic routing for the mock server?
**Answer:** Rather than registering Express routes for every user-created mock, API FORGE registers a single wildcard dispatcher `app.all('/mock/:workspaceSlug*', handleMockDispatch)`. The dispatcher inspects the incoming method and relative path dynamically against the SQLite database, enabling instant updates without server restarts.

### Q19: Why should an API return structured error responses?
**Answer:** Structured errors (e.g. `{ success: false, error: { code: 'NOT_FOUND', message: '...' } }`) provide machine-readable error codes and human-readable messages, allowing API clients and frontends to programmatically handle specific error states without guessing from plain text.

### Q20: What is CORS and why is it important in local developer tools?
**Answer:** Cross-Origin Resource Sharing (CORS) is a browser security mechanism that restricts web applications running on one origin from accessing resources on a different origin. API FORGE configures CORS to permit communication from the local Vite dev server (`http://localhost:5173`) while rejecting requests from arbitrary third-party origins.

---

## Section 3: Database & Relational Persistence (Questions 21–28)

### Q21: Why was SQLite chosen over MongoDB, MySQL, or PostgreSQL for this project?
**Answer:** SQLite is an embedded, serverless, zero-configuration relational database stored as a single file on disk (`apiforge.sqlite`). It requires no external database server process, cloud credentials, or background services, ensuring API FORGE runs reliably and completely offline on any standard PC or laptop.

### Q22: What is Write-Ahead Logging (WAL) mode in SQLite?
**Answer:** In standard rollback journal mode, writing locks the entire database, blocking readers. In WAL mode (`PRAGMA journal_mode = WAL;`), modifications are appended to a separate `-wal` file. This allows readers to continue reading the main database concurrently while writes occur, significantly improving performance.

### Q23: Why are foreign key constraints important, and how are they enabled in SQLite?
**Answer:** SQLite disables foreign key enforcement by default for backward compatibility. In API FORGE, `PRAGMA foreign_keys = ON;` is executed on connection initialization. This guarantees referential integrity, ensuring child entities (such as folders and requests) cannot reference non-existent collections or workspaces.

### Q24: What is the purpose of database migrations, and how do they work in API FORGE?
**Answer:** Database migrations track and apply versioned schema changes over time. In [`migrationRunner.js`](file:///server/src/database/migrationRunner.js), API FORGE queries the `schema_migrations` table and applies pending `.sql` migration files in sequence inside atomic database transactions (`BEGIN TRANSACTION; ... COMMIT;`), ensuring schema updates are reproducible and safe.

### Q25: How does API FORGE prevent SQL Injection?
**Answer:** API FORGE strictly uses parameterized queries (`db.prepare('SELECT * FROM students WHERE id = ?').get(id)`). User-supplied inputs are passed as separate bind parameters rather than being concatenated into raw SQL strings, ensuring the SQLite engine parses SQL commands and data separately.

### Q26: What is database indexing and which indexes are implemented in API FORGE?
**Answer:** Indexes are specialized B-tree data structures that speed up query lookup times from $O(N)$ table scans to $O(\log N)$. API FORGE defines indexes on frequently queried foreign keys, search filters, and unique paths (e.g. `idx_workspaces_slug`, `idx_mock_lookup`, `idx_history_workspace`, `idx_students_email`).

### Q27: How are cascade deletions configured in API FORGE?
**Answer:** Foreign keys specify explicit deletion policies. Deleting a collection cascades to delete its folders and requests (`ON DELETE CASCADE`), while deleting a saved request sets foreign keys in historical audit logs to null (`ON DELETE SET NULL`), preserving execution metrics.

### Q28: How does API FORGE seed demonstration data idempotently?
**Answer:** In [`001_demo_seed.js`](file:///server/src/database/seeds/001_demo_seed.js), every seed record check queries for existing primary keys or unique slugs (`SELECT id FROM workspaces WHERE id = 'ws-demo-lab'`) before inserting. If the records already exist, the seed script completes without creating duplicates or overwriting user data.

---

## Section 4: Security & SSRF Protection (Questions 29–36)

### Q29: What is Server-Side Request Forgery (SSRF)?
**Answer:** SSRF is a security vulnerability where an attacker manipulates a server into executing unintended HTTP requests on their behalf, potentially accessing internal network services, cloud metadata endpoints, or local loopback services that are protected from external access.

### Q30: How does API FORGE prevent SSRF in Local Demonstration Mode?
**Answer:** In Local Demonstration Mode, [`ssrfValidator.js`](file:///server/src/security/ssrfValidator.js) restricts outbound requests strictly to the server's own loopback port (`127.0.0.1:5000`) for mock (`/mock/...`) and demo (`/demo/...`) paths. Requests to management endpoints (`/api/v1`) or other local ports (`3306`, `8080`) are blocked before an outbound connection is made.

### Q31: Why are cloud metadata endpoints (`169.254.169.254`) a major security risk?
**Answer:** In cloud environments (AWS, Azure, GCP), the link-local address `169.254.169.254` serves instance metadata, IAM credentials, and temporary security tokens. An unvalidated outbound request engine could allow an attacker to steal host credentials. API FORGE explicitly blocks `169.254.169.254` and link-local ranges.

### Q32: How are sensitive session secrets protected in API FORGE?
**Answer:** Environment variables marked as secrets have their live values kept strictly in Node.js process memory using a `Map` in [`secretStore.js`](file:///server/src/security/secretStore.js). Secret values are never saved to SQLite, never written to log files, and never exported in JSON collections.

### Q33: How does API FORGE sanitize URLs and request history?
**Answer:** The [`sanitizer.js`](file:///server/src/security/sanitizer.js) module strips embedded credentials (`user:pass@host`), redacts sensitive query parameters matching tokens/keys/passwords with `[REDACTED]`, and replaces authorization headers before persisting records in `request_history`.

### Q34: What is the threat of IPv4-mapped IPv6 addresses (e.g. `::ffff:127.0.0.1`)?
**Answer:** Attackers often encode forbidden IPv4 addresses in IPv6 dual-stack formats to bypass simple string-matching filters. API FORGE uses `ipaddr.js` to normalize and unmap IPv4-mapped IPv6 addresses before evaluating CIDR subnet restrictions.

### Q35: How does API FORGE protect against Denial of Service via large responses?
**Answer:** Rather than buffering entire responses into memory before checking size, API FORGE monitors incoming stream chunks in real time. If the accumulated payload exceeds the 5MB limit, the request stream is immediately aborted and destroyed via `clientReq.destroy()`.

### Q36: Why are user scripts and `eval()` avoided in the assertion engine?
**Answer:** Using `eval()` or `new Function()` to execute user-supplied test scripts creates severe Remote Code Execution (RCE) risks. API FORGE implements a declarative assertion engine that evaluates structured comparison rules (`status_equals`, `time_below`, `json_property_equals`) using safe dot-path traversal without executing arbitrary JavaScript.

---

## Section 5: Testing, Tooling & Frontend Architecture (Questions 37–45)

### Q37: How does API FORGE interpolate environment variables?
**Answer:** In [`environmentResolutionService.js`](file:///server/src/services/environmentResolutionService.js), regex `\{\{([a-zA-Z0-9_-]+)\}\}` matches variable placeholders. It recursively interpolates values, throws an `UNDEFINED_VARIABLE` error for missing variables, and tracks a `visited` Set to detect and throw on circular references (e.g. `a -> {{b}} -> {{a}}`).

### Q38: How does API FORGE calculate API analytics without fake benchmarks?
**Answer:** In [`analyticsService.js`](file:///server/src/services/analyticsService.js), SQL aggregations query `request_history` directly: `COUNT(*)`, `AVG(response_time_ms)`, and percentile calculations sorting actual latency samples to derive median (p50) and 95th percentile (p95) response times.

### Q39: What is the role of Zustand in the frontend architecture?
**Answer:** Zustand provides a lightweight, boiler-plate-free state management store (`workspaceStore.js`) for managing client UI state that doesn't belong in the server cache: active tabs, sidebar collapse states, active workspace selections, and dark/light theme preferences.

### Q40: What is the role of TanStack Query (React Query)?
**Answer:** TanStack Query handles server state synchronization, query caching, background refetching, and mutations. When a user creates a student, mock endpoint, or executes a request, TanStack Query invalidates related query keys, automatically triggering fresh UI updates.

### Q41: How does API FORGE generate OpenAPI 3.0 specifications?
**Answer:** In [`documentationService.js`](file:///server/src/services/documentationService.js), the platform inspects configured mock endpoints and the demonstration Student CRUD API to construct an OpenAPI 3.0-compliant JSON document containing server URLs, paths, methods, request bodies, and response schemas.

### Q42: How does API FORGE import Postman collections safely?
**Answer:** In [`importExportService.js`](file:///server/src/services/importExportService.js), the parser extracts collection names, folders, request methods, URLs, headers, and bodies from Postman Collection v2.1 schemas while intentionally skipping executable test/pre-request scripts to enforce security.

### Q43: How is dark and light theming implemented and persisted?
**Answer:** Theming uses CSS custom variables (`--bg-main`, `--bg-primary`, `--bg-border`) toggled by adding a `dark` or `light` class to the HTML document element. The user preference is saved to `localStorage` and restored automatically on subsequent application launches.

### Q44: What is the purpose of the Collection Runner?
**Answer:** The Collection Runner sequentially executes all saved requests in an API collection. It allows developers to specify an environment, select requests, configure bounded iteration loops (1–3), and view a consolidated pass/fail report across all requests and declarative assertions.

### Q45: How can you verify that API FORGE is genuinely functioning end-to-end?
**Answer:** By running `npm run test:e2e`, the automated acceptance test suite executes all 17 mandatory scenarios covering real HTTP networking, mock dispatching, database persistence, declarative assertion verification, timeout handling, and SSRF security defense.
