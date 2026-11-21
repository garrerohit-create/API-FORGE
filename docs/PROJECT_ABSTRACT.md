# Academic Project Abstract

**Project Title:** API FORGE — Integrated API Development & Testing Platform  
**Subject:** Node.js / Advanced Web Engineering  
**Project Category:** Developer Tools / Distributed Systems Engineering  
**Academic Type:** College Project-Based Learning (PBL) Application  
**Runtime & Environment:** Node.js v24.x LTS / Windows 11 / Local Execution  

---

## 1. Problem Statement

Modern software engineering relies extensively on RESTful application programming interfaces (APIs) for decoupled microservices, mobile backends, and distributed systems. However, developers frequently encounter friction during the API development lifecycle:
- External API testing utilities (e.g., Postman, Insomnia) increasingly require cloud accounts, paid tier subscriptions, and active internet connectivity, creating data privacy and offline development challenges.
- Simulating unbuilt backend endpoints often requires setting up heavyweight third-party mock servers or manually modifying codebase routing files.
- Academic and enterprise testing tools frequently rely on unsafe script evaluation (`eval()` or JavaScript injection) for test assertions, introducing severe Remote Code Execution (RCE) and Server-Side Request Forgery (SSRF) vulnerabilities.
- Novice developers struggle to visualize live telemetry metrics, latency distributions, and assertion outcomes from real database execution records.

---

## 2. Objectives

The primary objectives of the **API FORGE** platform are:
1. **Unified Developer Environment**: Provide a local-first platform combining an interactive multi-tab HTTP API client, dynamic mock REST server, persistent demonstration CRUD service, and automated assertion engine.
2. **True Full-Stack Implementation**: Connect every feature end-to-end (Frontend $\rightarrow$ Backend $\rightarrow$ SQLite Database $\rightarrow$ Outbound Target API $\rightarrow$ Real-Time Telemetry).
3. **Enterprise Outbound Security**: Eliminate SSRF risks and credential leakage through strict IP validation, recursive management route blocking, link-local and cloud metadata blocking, and process-memory secret isolation.
4. **Declarative Testing Without Arbitrary Code Execution**: Implement a safe, type-aware assertion engine supporting status codes, latency thresholds, response sizes, header contents, and nested JSON dot-paths without `eval()`.
5. **Real-Time Telemetry & Transparent Analytics**: Derive all dashboard cards, percentiles (Min, Max, Median, P95), and timeline charts directly from actual SQLite execution records rather than simulated benchmarks.
6. **Zero-Cloud Dependency**: Ensure 100% functionality in an isolated, offline environment without requiring cloud database servers or external API keys.

---

## 3. Technology Stack

- **Backend Runtime**: Node.js v24.x LTS (ES Modules)
- **Web Application Framework**: Express.js 4.x
- **Database Engine**: Relational SQLite 3 via Node.js native `node:sqlite` (`DatabaseSync`) in Write-Ahead Logging (WAL) mode with enforced foreign keys
- **Security & Validation**: Helmet, custom CORS policy, Zod, `ipaddr.js` for CIDR subnet classification, in-memory process secret store
- **Frontend Architecture**: React 18, Vite, Tailwind CSS (with Dark and Light theme tokens), Zustand, TanStack Query, Lucide Icons, Recharts
- **Testing Frameworks**: Vitest, Supertest, custom End-to-End acceptance runner

---

## 4. Implementation Summary

API FORGE implements a modular three-tier architecture:
- **Presentation Layer**: Built with React and Vite, featuring a persistent app shell, collapsible navigation, multi-tab request builder, visual mock endpoint builder, live student management table, and interactive OpenAPI documentation.
- **Business Logic Layer**: Comprises a suite of specialized Express services:
  - `RequestExecutionService`: Dispatches outbound HTTP requests with monotonic latency timing (`performance.now()`), response size streaming limits (5MB), and `AbortController` cancellation.
  - `DestinationValidationService` (`ssrfValidator.js`): Enforces local loopback and public API security policies.
  - `MockDispatchService`: Dynamically intercepts `/mock/:workspaceSlug/*` requests and serves configurable responses with non-blocking simulated latency.
  - `AssertionEngine`: Executes declarative validation rules across response status, duration, headers, and body structures.
  - `SecretStore`: Manages session secrets strictly in Node.js process memory.
  - `AnalyticsService`: Executes SQL aggregations for latency percentiles and distribution charts.
  - `ImportExportService`: Manages native `api-forge/v1` and sanitized Postman v2.1 collections.
- **Data Layer**: 17 relational SQLite tables created through versioned transactions, including `workspaces`, `collections`, `requests`, `mock_endpoints`, `test_suites`, `request_history`, `students`, and `schema_migrations`.

---

## 5. Verified Outcomes

All 17 mandatory acceptance scenarios were verified through automated and manual testing:
- **Mock Service Responsiveness**: Dynamic mock routes return configured status codes and bodies immediately upon creation without server restarts; disabling routes returns 404.
- **Demonstration API Persistence**: The `/demo/v1/students` CRUD API persistently stores, validates, and paginates records in SQLite, demonstrating 200, 201, 204, 400, 404, and 409 status codes.
- **Automated Assertions**: Passed and failed test assertions output exact expected vs. actual values without script execution risks.
- **Security & Secret Isolation**: Outbound requests to cloud metadata (`169.254.169.254`), private subnets, and unauthorized local ports are rejected before connection establishment; session secrets are never persisted to disk.
- **Automated Test Suite**: 36 unit/integration tests and 17 end-to-end scenarios passed with 100% pass rate.
- **Offline Capability**: Verified that the entire platform operates fully offline on standard hardware without external network requests.
