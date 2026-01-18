import { Schema, model, Document } from "mongoose";

export interface Incident extends Document {
  incidentId: string;
  type: "earthquake" | "flood" | "fire" | "medical" | "infrastructure";

  severity: number; // 1–10 normalized scale
  status: "open" | "in_progress" | "resolved" | "archived";

  source: {
    originNodeId: string; // First node that detected the incident
    detectionMethod: "sensor" | "human" | "ai";
    detectedAt: Date;
  };

  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
    regionCode: string;
    description?: string;
  };

  traversalPath: Array<{
    hopIndex: number; // Explicit ordering (defensive)
    nodeId: string;
    nodeType: "edge" | "relay" | "regional" | "base";
    receivedAt: Date;
    forwardedAt?: Date;

    transport: {
      protocol: "http" | "mqtt" | "radio" | "satellite";
      latencyMs?: number;
      signalStrength?: number;
      encrypted: boolean;
    };

    geo?: {
      lat: number;
      lng: number;
    };

    integrity: {
      checksum?: string;
      verified: boolean;
    };
  }>;

  baseReceipt: {
    baseNodeId: string;
    receivedAt: Date;
    processingStatus: "queued" | "processing" | "completed";
  };

  payload: {
    summary: string;
    raw?: Record<string, unknown>;
    attachments?: string[];
  };

  audit: {
    createdAt: Date;
    updatedAt: Date;
    immutable: boolean;
  };
}

const TraversalHopSchema = new Schema(
  {
    hopIndex: { type: Number, required: true },
    nodeId: { type: String, required: true },
  },
  { _id: false }
);

const IncidentSchema = new Schema<Incident>(
  {
    incidentId: { type: String, required: true, index: true, unique: true },
    type: {
      type: String,
      enum: ["other", "fire"],
      required: true,
    },
    severity: { type: Number, required: true, min: 1, max: 10 },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "archived"],
      required: true,
      index: true,
    },
    source: {
      originNodeId: { type: String, required: true },
      detectionMethod: {
        type: String,
        enum: ["sensor", "ai"],
        required: true,
      },
      detectedAt: { type: Date, required: true },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      regionCode: { type: String, required: true },
      description: { type: String },
    },
    traversalPath: {
      type: [TraversalHopSchema],
      required: true,
      default: [],
    },
    baseReceipt: {
      baseNodeId: { type: String, required: true },
      receivedAt: { type: Date, required: true },
      processingStatus: {
        type: String,
        enum: ["queued", "processing", "completed"],
        required: true,
      },
    },
    payload: {
      summary: { type: String, required: true },
      raw: { type: Schema.Types.Mixed },
      attachments: { type: [String], default: [] },
    },
    audit: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      immutable: { type: Boolean, default: true },
    },
  },
  {
    collection: "incidents",
  }
);

IncidentSchema.index({ "location": "2dsphere" });
IncidentSchema.index({ "traversalPath.hopIndex": 1 });

export const IncidentModel = model<Incident>("Incident", IncidentSchema);

