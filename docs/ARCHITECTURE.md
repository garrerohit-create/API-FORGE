# API FORGE — System Architecture & Design

## 1. Architectural Philosophy

API FORGE is engineered around three core principles:
1. **Local-First Reliability**: Zero external database servers, cloud tokens, or network dependencies are required for core execution.
2. **Defensive Outbound Security**: Executing user-defined HTTP requests requires strict destination validation to eliminate Server-Side Request Forgery (SSRF).
3. **Transparent Demonstrability**: Every telemetry metric, assertion result, and latency reading is calculated from real SQLite execution records and monotonic timers rather than simulated data.

---

## 2. Three-Tier Modular Architecture

```mermaid
flowchart TD
    subgraph Client ["Presentation Layer (Client - React 18 + Vite)"]
        UI["Persistent App Shell & Navigation"]
        Tabs["Multi-Tab Request Editor"]
        Viewer["Response Inspector & Test Breakdown"]
        MockEditor["Visual Mock Builder"]
        AnalyticsUI["Recharts Telemetry Views"]
        Store["Zustand Store + TanStack Cache"]
    end

    subgraph Server ["Business Logic Layer (Server - Node.js 24 + Express)"]
        Router["Express REST Dispatcher (/api/v1, /demo/v1, /mock)"]
        SSRF["SSRF Guard & Destination Validator"]
        ExecEngine["Request Execution Engine (Monotonic Timer)"]
        AssertEngine["Declarative Assertion Engine"]
        MockEngine["Dynamic Mock Dispatcher & Delay Timer"]
        SecStore["In-Memory Secret Session Store"]
        AnalyticsSvc["Analytics Aggregation Engine"]
        Events["Node.js EventEmitter Lifecycle Bus"]
    end

    subgraph Data ["Data Layer (Relational SQLite)"]
        Conn["node:sqlite (DatabaseSync)"]
        WAL["WAL Mode & Foreign Keys Enabled"]
        Tables[("17 Relational Tables & Indexes")]
    end

    UI --> Store
    Tabs --> Store
    Store -->|HTTP / JSON| Router
    Router --> SSRF
    SSRF --> ExecEngine
    ExecEngine --> AssertEngine
    ExecEngine --> Events
    Router --> MockEngine
    Router --> SecStore
    Router --> AnalyticsSvc
    ExecEngine --> Conn
    MockEngine --> Conn
    AnalyticsSvc --> Conn
    Conn --> WAL --> Tables
```

---

## 3. Core Component Responsibilities

### 3.1 Presentation Layer (`client/src/`)
- **Persistent App Shell**: Houses the collapsible sidebar, breadcrumb topbar with live health ping, command palette (`Ctrl+K`), and status bar.
- **API Client Module**: Multi-tab request builder, query parameter editor, header management, body editors (JSON, Plain Text, URL-encoded), authentication selector, and response viewer.
- **Mock Server Manager**: Visual builder for mock endpoints, delay sliders, and real-time mock activity stream.
- **Demonstration CRUD View**: Interactive data table for the student management REST API with live search and pagination.
- **Test Suites & Collection Runner**: Declarative assertion management, sequential collection runner with progress tracking, and detailed pass/fail breakdown.
- **Analytics & History**: Interactive Recharts visualizations and filterable execution audit trail.

### 3.2 Business Logic Layer (`server/src/`)
- **`requestExecutionService.js`**: Orchestrates outbound HTTP requests. Resolves environment variables, enforces timeouts with `AbortController`, streams response bodies with hard size caps (5MB), and measures latency using `performance.now()`.
- **`ssrfValidator.js`**: Enforces outbound request security. In Local Demonstration Mode, restricts calls to loopback ports matching the server; blocks cloud metadata (`169.254.169.254`), private IP subnets, and recursive management API calls.
- **`assertionEngine.js`**: Evaluates assertions against response status, duration, size, headers, and JSON body paths without using `eval()` or `Function()`.
- **`mockDispatchService.js`**: Intercepts requests on `/mock/:workspaceSlug/*`, matches enabled database endpoints, applies non-blocking simulated latency via `setTimeout`, and logs activity.
- **`secretStore.js`**: Process memory `Map` holding active session secrets, ensuring secret values never leak to database files or exports.
- **`analyticsService.js`**: Executes real SQL aggregation queries for total requests, success rates, latency percentiles (min, max, mean, median, p95), status code distributions, and endpoint frequencies.

### 3.3 Data Layer (`server/src/database/`)
- Utilizes Node.js 24 native `node:sqlite` (`DatabaseSync`).
- Foreign key constraints enforced via `PRAGMA foreign_keys = ON;`.
- Write-Ahead Logging enabled via `PRAGMA journal_mode = WAL;` for high-throughput concurrent reads.
- Versioned migrations in `migrations/` tracked by the `schema_migrations` table.

---

## 4. Key Request Lifecycles

### 4.1 Outbound Request Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer
    participant UI as API Client (React)
    participant Exec as Execution Service (Node.js)
    participant SSRF as SSRF Validator
    participant Target as Target Endpoint / Mock
    participant Assert as Assertion Engine
    participant DB as SQLite DB

    User->>UI: Configure Request & Click Send
    UI->>Exec: POST /api/v1/executions
    Exec->>Exec: Interpolate {{variables}} & Auth
    Exec->>SSRF: Validate Destination URL & IP
    alt Destination Blocked
        SSRF-->>Exec: DestinationValidationError (403)
        Exec-->>UI: SSRF Policy Block Notification
    else Destination Permitted
        Exec->>Target: Execute HTTP Request (Monotonic Timer Started)
        Target-->>Exec: Return Headers & Stream Body (Size Checked)
        Exec->>Assert: Evaluate Declarative Assertions
        Assert-->>Exec: Assertion Pass/Fail Breakdown
        Exec->>DB: INSERT INTO request_history (Sanitized)
        Exec-->>UI: Return Structured Response Envelope
        UI-->>User: Render Pretty JSON, Latency, and Test Results
    end
```

### 4.2 Dynamic Mock Endpoint Resolution Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as HTTP Client (Curl / API Client)
    participant Dispatcher as Mock Dispatcher (/mock/:slug/*)
    participant DB as SQLite DB

    Client->>Dispatcher: GET /mock/demo/users
    Dispatcher->>DB: Query Workspace & Mock Endpoint
    alt Endpoint Not Found or Disabled
        Dispatcher-->>Client: 404 Not Found
    else Workspace Mock Service Disabled
        Dispatcher-->>Client: 503 Mock Service Disabled
    else Endpoint Active
        Dispatcher->>Dispatcher: Non-Blocking Delay (setTimeout)
        Dispatcher->>DB: INSERT INTO mock_activity
        Dispatcher-->>Client: Return Configured Status, Headers & Body
    end
```
