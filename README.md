# API FORGE — Integrated API Development & Testing Platform

> **Build. Test. Debug. Master.**  
> An integrated full-stack developer tool for building mock REST services, executing real HTTP requests, running declarative automated assertions, managing environments, and inspecting live API telemetry.

---

## 1. Overview

**API FORGE** is a developer platform created as an academic Project-Based Learning (PBL) application in Node.js. Inspired by professional tools such as Postman, Insomnia, and Mockoon, API FORGE offers an original, local-first engineering architecture with zero external database dependencies and strict local security safeguards.

### Key Capabilities

1. **Interactive Multi-Tab API Client**: Execute real HTTP requests (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`) with monotonic latency measurement, size caps, and header/parameter/body builders.
2. **Dynamic Mock Server**: Configure mock routes with customizable status codes, headers, delay simulation, and real-time activity logging under `/mock/:workspaceSlug/*`.
3. **Persistent Demonstration CRUD API**: A built-in student management REST API (`/demo/v1/students`) with persistent SQLite storage, pagination, unique email validation, and standard HTTP response codes (`200`, `201`, `204`, `400`, `404`, `409`).
4. **Declarative Assertion Testing Engine**: Attach type-aware assertions (status code, latency threshold, response size, header values, JSON property paths/types/lengths) without unsafe `eval()` or code execution.
5. **Collection Runner**: Execute request collections sequentially with configurable bounded iterations, progress tracking, and aggregated metrics.
6. **Environment Variables & Session Secrets**: Interpolate dynamic variables (`{{base_url}}`, `{{token}}`) across URLs, headers, and payloads, keeping sensitive secret tokens strictly in process memory.
7. **SQLite-Backed Telemetry & Analytics**: Real SQL aggregations for latency percentiles (Min, Max, Mean, Median, P95), status code distributions, and request trends over time.
8. **Documentation & Code Generation**: Auto-generate OpenAPI 3.0 specifications, Markdown documentation, and client code snippets (cURL, JavaScript Fetch, Node.js Axios, Python Requests, Express.js routes).
9. **Import & Export**: Native versioned collection format (`api-forge/v1`) and Postman Collection v2.1 import with automatic script sanitization.
10. **Enterprise-Grade SSRF Protection**: Strict outbound destination validation, loopback restriction, private subnet blocking, cloud metadata rejection, and input sanitization.

---

## 2. Technology Stack

- **Backend Runtime**: Node.js v24.x LTS (ES Modules)
- **Web Framework**: Express.js 4.x
- **Database**: Relational SQLite using Node.js 24 native `node:sqlite` (`DatabaseSync`) in WAL mode with enforced foreign keys
- **Security**: Helmet, custom CORS policy, IP/SSRF destination classifier (`ipaddr.js`), credential redactor
- **Frontend Framework**: React 18 with Vite
- **Styling & Theming**: Tailwind CSS with custom CSS variables supporting Dark & Light modes
- **State Management**: Zustand
- **Server Cache & Synchronization**: TanStack Query (React Query)
- **Visualization**: Recharts for telemetry charts
- **Testing**: Vitest, Supertest, custom E2E verification suite

---

## 3. System Architecture

API FORGE implements a three-tier modular architecture:

```
[ Presentation Layer (React + Vite + Tailwind CSS) ]
                        │
                        ▼ (HTTP / REST API)
[ Business Logic Layer (Express Services & Engines) ]
   ├── Request Execution Service (SSRF Guard & Monotonic Timer)
   ├── Mock Endpoint Dynamic Dispatcher
   ├── Declarative Assertion Testing Engine
   ├── Environment Resolution & Secret Memory Store
   ├── Collection Runner Engine
   └── Analytics Aggregation Service
                        │
                        ▼ (Parameterized SQL Statements)
[ Data Layer (Node.js 24 Native SQLite / WAL Mode) ]
   └── 17 Relational Tables with Foreign Key Constraints
```

---

## 4. Quick Start & Installation

### Prerequisites

- Node.js v22.x or v24.x LTS
- npm v10+
- Windows 11, macOS, or Linux

### Installation

Clone the repository and install all workspace dependencies:

```bash
git clone <repository-url>
cd "nodejs pbl"
npm install
```

### Database Initialization

Run database migrations and seed demonstration data:

```bash
npm run db:migrate
npm run db:seed
```

### Running in Development Mode

Starts both the backend (with file watching) and frontend development servers concurrently:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://127.0.0.1:5000/api/v1/health`
- Demo Student API: `http://127.0.0.1:5000/demo/v1/students`
- Mock Dispatcher: `http://127.0.0.1:5000/mock/demo/users`

### Running in Production-Style Local Mode

Builds the frontend client and serves the complete full-stack application directly from the single loopback origin:

```bash
npm run build
npm start
```

Access the application in your browser at `http://127.0.0.1:5000`.

---

## 5. Automated Testing & Verification

API FORGE includes automated unit, integration, security, and end-to-end acceptance tests.

Run backend unit and integration tests:

```bash
npm test
```

Run end-to-end acceptance verification (all 17 mandatory scenarios):

```bash
npm run test:e2e
```

Run code hygiene and formatting checks:

```bash
npm run lint
npm run format
```

---

## 6. Academic Documentation Index

- [Architecture Guide](file:///docs/ARCHITECTURE.md): Three-tier system architecture, component breakdown, and request lifecycles with Mermaid diagrams.
- [Database Schema & ER Diagram](file:///docs/DATABASE.md): Detailed 17-table relational schema, indexes, constraints, and migration strategy.
- [Node.js Concepts in Action](file:///docs/NODEJS_CONCEPTS.md): Direct mapping of Node.js academic concepts to actual implementation files and functions.
- [Security Architecture](file:///docs/SECURITY.md): SSRF safeguards, destination validation, in-memory secret isolation, and threat model.
- [API Reference](file:///docs/API_REFERENCE.md): Complete REST endpoint documentation for management, mock, and demonstration routes.
- [Demonstration Guide](file:///docs/DEMO_GUIDE.md): 5-to-10 minute presentation script and workflow for evaluators.
- [Viva Voce Preparation](file:///docs/VIVA_PREPARATION.md): 40+ technical questions and in-depth answers for academic oral exams.
- [Project Abstract](file:///docs/PROJECT_ABSTRACT.md): Formal academic project summary.
- [Project Completion Report](file:///PROJECT_COMPLETION_REPORT.md): Final verification audit and evidence report.

---

## 7. License

MIT License. Developed for Node.js College Project-Based Learning.
