# Mesh Forest API Gateway

## Purpose

This project is a **client-facing, read-only API Gateway** for a natural-disaster coping system. It sits in front of multiple internal backend services and exposes a **stable, frontend-friendly HTTP API** for dashboards and external integrators.

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
- **Perform authentication, authorization, or identity management**
  - No user accounts, roles, or permissions
  - Assumes authn/authz is handled upstream (e.g. API management, identity provider, or service mesh)
- **Execute heavy domain logic or ML inference**
  - No fire or storm simulation
  - No risk-scoring algorithms or prediction models
  - No training or serving of machine-learning models
- **Own any domain source of truth**
  - Does not write to operational databases
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

As the system evolves, richer aggregation logic and additional endpoints should **continue to respect these boundaries**: client-facing, read-only, stateless, and decoupled from backend internals.
