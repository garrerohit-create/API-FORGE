# API FORGE — Node.js Academic Concepts & Implementation Mapping

This document provides a comprehensive mapping of fundamental Node.js academic concepts to their exact implementations within the API FORGE codebase.

---

## 1. HTTP Communication & Core Server Architecture

Node.js provides native `node:http` and `node:https` modules for implementing HTTP servers and clients without external libraries.

- **Server Creation & Loopback Binding**:
  - *Location*: [`server/src/server.js`](file:///server/src/server.js#L26-L35)
  - *Concept*: Binds an Express app to loopback address `127.0.0.1` on port `5000` to prevent exposure on external network interfaces.
- **Outbound HTTP Client with Monotonic Timing**:
  - *Location*: [`server/src/services/requestExecutionService.js`](file:///server/src/services/requestExecutionService.js#L145-L215)
  - *Concept*: Uses `http.request()` and `https.request()` with `performance.now()` to measure true network latency without clock drift.

---

## 2. Event Loop & Asynchronous Non-Blocking I/O

Node.js runs single-threaded using an event loop powered by libuv. CPU-intensive or blocking operations stall the loop, so non-blocking patterns are mandatory.

- **Non-Blocking Simulated Latency**:
  - *Location*: [`server/src/services/mockDispatchService.js`](file:///server/src/services/mockDispatchService.js#L68-L72)
  - *Concept*: Uses `await new Promise((resolve) => setTimeout(resolve, delayMs))` to introduce artificial mock delay without blocking other concurrent requests.
- **Asynchronous DNS Resolution**:
  - *Location*: [`server/src/security/ssrfValidator.js`](file:///server/src/security/ssrfValidator.js#L96-L102)
  - *Concept*: Uses `dns.promises.lookup()` to asynchronously resolve hostnames to IP addresses before checking CIDR subnet safety.

---

## 3. Promises and Async/Await Orchestration

- **Sequential Collection Execution**:
  - *Location*: [`server/src/services/collectionRunnerService.js`](file:///server/src/services/collectionRunnerService.js#L65-L145)
  - *Concept*: Loops through collection requests using `for...of` with `await RequestExecutionService.executeRequest()`, coordinating sequential execution, iteration counts, and cancellation checkpoints.
- **AbortController Cancellation**:
  - *Location*: [`server/src/services/requestExecutionService.js`](file:///server/src/services/requestExecutionService.js#L160-L175)
  - *Concept*: Pairs standard `AbortController` with `setTimeout` to abort outgoing requests on timeout (`ETIMEDOUT`) or explicit user cancellation (`ECANCELLED`).

---

## 4. Node.js EventEmitter Pattern

The `node:events` module implements the Observer design pattern to decouple application components.

- **Central Event Bus**:
  - *Location*: [`server/src/events/appEventEmitter.js`](file:///server/src/events/appEventEmitter.js#L7-L28)
  - *Concept*: Custom `AppEventEmitter` subclass extending `EventEmitter` with listener capping and error protection.
- **Event Emission**:
  - *Location*: [`server/src/services/requestExecutionService.js`](file:///server/src/services/requestExecutionService.js#L143-L235)
  - *Concept*: Emits `request.started`, `request.completed`, and `request.failed` to record telemetry without tight coupling.

---

## 5. Streams and Bounded Buffers

- **Streaming Response Size Capping**:
  - *Location*: [`server/src/services/requestExecutionService.js`](file:///server/src/services/requestExecutionService.js#L177-L192)
  - *Concept*: Collects incoming response chunks as a readable stream. If `receivedBytes` exceeds `maxResponseBytes` (default 5MB), it immediately destroys the socket via `clientReq.destroy()` to prevent memory exhaustion attacks.
- **Accurate Byte-Size Measurement with Buffer**:
  - *Location*: [`server/src/services/requestExecutionService.js`](file:///server/src/services/requestExecutionService.js#L196-L200)
  - *Concept*: Uses `Buffer.concat(chunks)` to measure accurate payload byte size and convert cleanly to UTF-8.

---

## 6. Express Middleware Architecture

Express middleware functions execute sequentially during the request-response lifecycle.

- **Structured Input Validation Middleware**:
  - *Location*: [`server/src/middleware/validate.js`](file:///server/src/middleware/validate.js#L4-L14)
  - *Concept*: Higher-order function wrapping Zod schemas for validating `req.body`, `req.query`, or `req.params`.
- **Security Headers & Restricted CORS**:
  - *Location*: [`server/src/middleware/securityHeaders.js`](file:///server/src/middleware/securityHeaders.js#L5-L55)
  - *Concept*: Configures Helmet with custom Content Security Policy and restricts CORS to authorized local development origins.
- **Centralized Error Handler**:
  - *Location*: [`server/src/middleware/errorHandler.js`](file:///server/src/middleware/errorHandler.js#L4-L45)
  - *Concept*: Formats errors into standard JSON envelopes `{ success: false, error: { code, message, details } }`.

---

## 7. Node.js Native SQLite Database Integration

Node.js 24 introduces native SQLite support via `node:sqlite`.

- **Database Connection & WAL Configuration**:
  - *Location*: [`server/src/database/connection.js`](file:///server/src/database/connection.js#L8-L36)
  - *Concept*: Instantiates `new DatabaseSync()` with `PRAGMA foreign_keys = ON;` and `PRAGMA journal_mode = WAL;`.
- **Versioned Migration Runner**:
  - *Location*: [`server/src/database/migrationRunner.js`](file:///server/src/database/migrationRunner.js#L9-L48)
  - *Concept*: Reads SQL migration files from the filesystem using `node:fs` and applies them inside atomic database transactions (`BEGIN TRANSACTION; ... COMMIT;`).

---

## 8. Process Memory vs Persistent Storage (Secret Isolation)

- **In-Memory Session Secret Store**:
  - *Location*: [`server/src/security/secretStore.js`](file:///server/src/security/secretStore.js#L6-L40)
  - *Concept*: Uses an in-memory `Map` in Node.js process memory for session-only secrets (API keys, bearer tokens) so they never touch SQLite disk or export files.
