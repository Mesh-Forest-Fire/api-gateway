# Mesh Forest API Gateway

## Purpose

This project is a **client-facing API Gateway** for a natural-disaster coping system. It sits in front of multiple internal backend services and exposes a **stable, frontend-friendly HTTP API** for dashboards and external integrators. It also accepts **base-node incident submissions**.

The gateway focuses on **aggregating and presenting system state**, not performing domain computations itself. It is intentionally **stateless** and is designed to run behind a service mesh or load balancer.

## What This Gateway Does

- **Serves as the single entrypoint for clients**
  - Frontend dashboards (public/admin)
  - External machine-to-machine integrations
- **Exposes read-only endpoints**
  - Current fire risk state
  - Current storm risk state
  - Combined / overall risk views
  - Alert summaries
  - System health / service status
- **Accepts incident creation from base nodes**
  - Base nodes post validated incident payloads to the API
- **Normalizes and stabilizes data contracts**
  - Hides internal service details and schemas
  - Presents consistent, versioned response shapes
  - Uses clear TypeScript contracts (see `src/types.ts`)
- **Aggregates data from multiple backend domains**
  - Fire domain services
  - Storm domain services
  - Risk aggregation services
  - Decision engine
  - Alerting services
  - System state / read-model services
- **Attaches gateway-level metadata** to responses
  - API version
  - Data freshness and last update timestamps
  - Source attribution (which domains contributed)
  - High-level degradation indicators (full vs partial data)

## What This Gateway Does *Not* Do

To keep responsibilities clear and avoid hidden coupling, the API Gateway **explicitly does not**:

- **Ingest or process raw sensor data**
  - No direct communication with Raspberry Pi nodes or edge devices
  - No low-level telemetry or hardware protocols
- **Perform full authentication, authorization, or identity management**
  - No user accounts, roles, or permissions
  - Assumes authn/authz is handled upstream (e.g. API management, identity provider, or service mesh)
  - Optional **basic auth** can be enabled for protected routes in non-production setups
- **Execute heavy domain logic or ML inference**
  - No fire or storm simulation
  - No risk-scoring algorithms or prediction models
  - No training or serving of machine-learning models
- **Own any domain source of truth**
  - Does not write to operational databases outside incident submission
  - Does not maintain long-lived state beyond in-memory caches
- **Act as an admin backdoor to internal services**
  - No passthrough debug endpoints
  - No internal-only operations are exposed

## High-Level Responsibilities

At a high level, this gateway is responsible for:

1. **API Contract**
   - Define and own the external HTTP contracts used by clients
   - Keep contracts stable, versioned, and well-documented
   - Represent contracts as TypeScript types in `src/types.ts`

2. **Read-Model Aggregation**
   - Call multiple backend services
   - Combine their responses into higher-level read models suitable for UIs and integrations
   - Surface clear indicators when some data is missing or degraded

3. **Boundary Enforcement**
   - Prevent leaking internal service schemas, IDs, or implementation details
   - Map internal errors to safe, client-facing error shapes (no stack traces, no internal codes)

4. **Operational Transparency**
   - Attach metadata about data freshness, sources, and degradation
   - Provide health/readiness endpoints for runtime monitoring

## Non-Goals

The following are **out of scope** for this project and should be implemented in other services/components:

- User/session management and security policies
- Data ingestion pipelines and event processing
- Long-term data storage, analytics, or reporting engines
- Management of infrastructure concerns (service mesh, ingress gateways, etc.)

## Current Implementation Snapshot

This repository currently contains:

- A minimal Express-based server (`src/app.ts`)
- A simple MVC-style structure under `src/`:
  - `controllers/` – request handlers
  - `models/` – simple TypeScript domain models
  - `routes/` – HTTP route definitions
  - `views/` – response-shaping helpers or documentation
  - `db/` – infrastructure clients (e.g., `mongooseClient.ts`)
  - `types.ts` – core API Gateway TypeScript contracts

As the system evolves, richer aggregation logic and additional endpoints should **continue to respect these boundaries**: client-facing, mostly read-only, stateless, and decoupled from backend internals.

---

# Client Integration Guide

This section describes how a client can **read live incident data** and how a **base node** can **submit new incidents**.

## Base URL

All endpoints are mounted under:

```
http://<host>:<port>/api
```

## Login (No Session)

This endpoint validates credentials on every request; no session or token is created.

```
POST /api/login
```

Request body:

```json
{
  "username": "admin",
  "password": "changeme"
}
```

Response:

```json
{
  "approved": true
}
```

## Optional Basic Auth (Protected Routes)

For simple, hardcoded protection (e.g., during demos or internal environments), you can enable Basic auth for selected routes (currently `/api/incidents` and `/api/incidents/stream`).

### Environment variables

- `AUTH_ENABLED` — set to `true` to enable auth (default: `false`)
- `AUTH_USERNAME` — required when auth is enabled
- `AUTH_PASSWORD` — required when auth is enabled

### Example

```
AUTH_ENABLED=true
AUTH_USERNAME=admin
AUTH_PASSWORD=changeme
```

### Request body example

Send credentials in the JSON body (recommended for demo login endpoints):

```json
{
  "username": "admin",
  "password": "changeme"
}
```

### Request header example (fallback)

You can also send a Basic auth header:

```
Authorization: Basic <base64(username:password)>
```

## Read (Client / Dashboard)

### 1) List incidents (paginated)

```
GET /api/incidents?page=1&limit=10
```

Response shape:

```json
{
  "data": [/* incident documents */],
  "page": 1,
  "limit": 10,
  "total": 123,
  "totalPages": 13
}
```

**Live stream (polling at $1.5\,\text{s}$):**

Because the API is HTTP-based, the simplest way to achieve a “live” view is **polling**. For near‑real‑time dashboards, poll every $1.5\,\text{s}$ with a safe client strategy:

1. Poll `GET /api/incidents?page=1&limit=20` every $1.5\,\text{s}$.
2. Replace or merge the returned `data` into the UI (treat page 1 as the “hot window”).
3. Keep a client-side `lastUpdated` timestamp and display it in the UI.
4. On `429` or `503`, back off (exponential + jitter) before retrying.
5. If you add delta support later, prefer `since=<lastUpdated>` to reduce payload.
6. If you add caching later, use `ETag`/`If-None-Match` or `Last-Modified` to get `304 Not Modified` on unchanged data.

### 2) Get incident by ID

```
GET /api/incidents/:id
```

Returns the incident document or `404` if not found.

## Write (Base Node)

### 3) Create incident

```
POST /api/incidents
```

#### Request body (expected shape)

```json
{
  "incidentId": "INC-OPTIONAL-001",
  "type": "fire",
  "severity": 7,
  "status": "open",
  "source": {
    "originNodeId": "edge-001",
    "detectionMethod": "sensor",
    "detectedAt": "2026-01-18T12:00:00.000Z"
  },
  "location": {
    "coordinates": [10.1234, 36.789],
    "regionCode": "REG-TEST",
    "description": "Warehouse district"
  },
  "traversalPath": [
    { "hopIndex": 0, "nodeId": "edge-001" },
    { "hopIndex": 1, "nodeId": "relay-007" }
  ],
  "baseReceipt": {
    "baseNodeId": "base-001",
    "receivedAt": "2026-01-18T12:01:00.000Z",
    "processingStatus": "queued"
  },
  "payload": {
    "summary": "Fire detected near industrial zone",
    "raw": { "temperature": 650, "smokeDensity": 0.92 },
    "attachments": ["s3://bucket/incident/001.jpg"]
  }
}
```

Notes:

- `incidentId` is optional; if not provided the server generates one.
- `detectedAt` and `receivedAt` are optional; if missing, the server uses current time.
- `traversalPath` is optional. If provided, `hopIndex` is auto-filled when missing.

#### Response

`201 Created` with the full incident document as JSON.

---

# Tests

Run the test suite:

```
npm test
```

The suite includes:
- Unit tests for the Basic auth middleware
- Integration checks that protected routes reject unauthenticated access
