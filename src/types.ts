
// API version exposed by the gateway (wire-level contract)
export type ApiVersion = "v1" | "v2";

export type RegionId = string;


// Canonical timestamp representation used in all gateway contracts (ISO-8601, UTC)
export type IsoTimestamp = string;

// Expresses qualitative confidence in a reported value
export type ConfidenceLevel = "low" | "medium" | "high";

// Numeric range used to describe uncertainty around a reported metric
export interface UncertaintyRange {
  // Best-effort lower bound of the value, if applicable
  lowerBound?: number;
  // Best-effort upper bound of the value, if applicable
  upperBound?: number;
}

export interface Confidence {
  level: ConfidenceLevel;
  // Optional quantitative uncertainty description
  uncertainty?: UncertaintyRange;
}

// Risk & Severity Modeling

export type RiskLevel = "none" | "low" | "moderate" | "high" | "extreme";

export type SeverityLevel = "info" | "warning" | "critical" | "emergency";

export type TrendDirection = "increasing" | "stable" | "decreasing" | "unknown";

// Gateway-Specific Metadata

// Indicates how fresh the underlying data is
export interface DataFreshness {
  // Timestamp when the underlying data was last updated in the system
  lastUpdatedAt: IsoTimestamp;
  // Timestamp when this snapshot was assembled by the gateway
  snapshotGeneratedAt: IsoTimestamp;
  // True if data is considered fresh according to gateway policy
  isFresh: boolean;
  // If stale, number of seconds beyond the freshness threshold
  staleBySeconds?: number;
}

// Identifies which backend domains contributed to a given snapshot
export interface SourceAttribution {
  services: BackendServiceId[];
}

// Service Boundary Types

export type BackendServiceId =
  | "fire-domain"
  | "storm-domain"
  | "risk-aggregation"
  | "decision-engine"
  | "alerting"
  | "system-state";

// Outcome of a single backend call as seen by the gateway
export interface ServiceCallStatus {
  serviceId: BackendServiceId;
  // When the gateway started the call
  requestedAt: IsoTimestamp;
  // When the gateway finished waiting for the call (success, error, or timeout)
  completedAt: IsoTimestamp;
  // True if a timeout occurred before a definitive response was received
  timedOut: boolean;
  // True if a pre-defined fallback was used instead of live data
  usedFallback: boolean;
  // Optional classifier for the outcome (e.g. "ok", "error", "degraded")
  outcome: "ok" | "error" | "degraded";
}

// Aggregated view of backend behaviour for a single gateway response
export interface AggregationMetadata {
  serviceCalls: ServiceCallStatus[];
}

// Describes timeout and fallback characteristics applied for a given domain
export interface TimeoutAndFallbackInfo {
  // Configured timeout in milliseconds
  timeoutMs: number;
  // Whether this response actually hit a timeout
  didTimeout: boolean;
  // Whether a fallback path (cached / approximate data) was used
  fallbackUsed: boolean;
  // Optional human-readable reason for fallback
  fallbackReason?: string;
}

// System State Models (Read Models)

export interface FireRiskState {
  regionId: RegionId;
  level: RiskLevel;
  trend: TrendDirection;
  confidence: Confidence;
  metadata: DataFreshness & SourceAttribution;
}

export interface StormRiskState {
  regionId: RegionId;
  level: RiskLevel;
  trend: TrendDirection;
  confidence: Confidence;
  metadata: DataFreshness & SourceAttribution;
}

// Combined / overall risk state for a region
export interface CombinedRiskState {
  regionId: RegionId;
  overallLevel: RiskLevel;
  // Component contributions
  fire?: FireRiskState;
  storm?: StormRiskState;
  trend: TrendDirection;
  confidence: Confidence;
  metadata: DataFreshness & SourceAttribution;
}

// Summary of alerts relevant to a region or system-wide view
export interface AlertSummaryItem {
  id: string;
  regionId?: RegionId;
  severity: SeverityLevel;
  title: string;
  // Short, human-readable description of the alert
  description: string;
  issuedAt: IsoTimestamp;
  // Optional time when the alert is no longer active
  resolvedAt?: IsoTimestamp;
}

export interface AlertState {
  alerts: AlertSummaryItem[];
  metadata: DataFreshness & SourceAttribution;
}

// Health state of the overall system as seen by the gateway
export type ComponentHealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface ServiceHealth {
  serviceId: BackendServiceId;
  status: ComponentHealthStatus;
  lastCheckedAt: IsoTimestamp;
}

export interface SystemHealthState {
  overallStatus: ComponentHealthStatus;
  components: ServiceHealth[];
  metadata: DataFreshness & SourceAttribution;
}

// Standard API Response Shapes

export interface ApiMetaBase {
  version: ApiVersion;
  generatedAt: IsoTimestamp;
}

// Successful, fully populated response
export interface ApiSuccessResponse<T> {
  status: "ok";
  meta: ApiMetaBase & {
    dataFreshness: DataFreshness;
    sources: SourceAttribution;
  };
  data: T;
}

// Successful but degraded/partial response where some domains could not contribute
export interface ApiDegradedResponse<T> {
  status: "partial";
  meta: ApiMetaBase & {
    dataFreshness: DataFreshness;
    sources: SourceAttribution;
    degraded: true;
    // Which domains were missing or approximated
    missingDomains: BackendServiceId[];
  };
  data: T;
}

export type ApiErrorCode =
  | "bad_request"
  | "not_found"
  | "rate_limited"
  | "upstream_unavailable"
  | "gateway_timeout"
  | "internal_error";

export interface ApiErrorDetails {
  code: ApiErrorCode;
  // Human-readable message suitable for display or logging
  message: string;
  // Optional identifier clients may use for support/debugging
  correlationId?: string;
}

export interface ApiErrorResponse {
  status: "error";
  meta: ApiMetaBase;
  error: ApiErrorDetails;
}

// Unified response type for typical endpoints
export type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiDegradedResponse<T>
  | ApiErrorResponse;

// Example composite read model for a typical dashboard view
export interface RegionalRiskSnapshot {
  regionId: RegionId;
  fire?: FireRiskState;
  storm?: StormRiskState;
  combined?: CombinedRiskState;
  alerts?: AlertState;
}

export interface DashboardState {
  regions: RegionalRiskSnapshot[];
  systemHealth: SystemHealthState;
}
