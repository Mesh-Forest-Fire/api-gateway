import { connectMongoose, mongoose } from "../../src/db/mongooseClient";
import { IncidentModel } from "../../src/models/incident";

async function main() {
  try {
    await connectMongoose();
    console.log("✅ Connected to MongoDB");

    const docs = [
      {
        incidentId: "INC-TEST-001",
        type: "fire",
        severity: 7,
        status: "open",
        source: {
          originNodeId: "edge-node-1",
          detectionMethod: "sensor",
          detectedAt: new Date(),
        },
        location: {
          type: "Point",
          coordinates: [10.1234, 36.7890],
          regionCode: "REG-001",
          description: "Test location 1",
        },
        traversalPath: [],
        baseReceipt: {
          baseNodeId: "base-1",
          receivedAt: new Date(),
          processingStatus: "queued",
        },
        payload: {
          summary: "Test fire incident",
          raw: { test: true },
          attachments: [],
        },
        audit: {
          createdAt: new Date(),
          updatedAt: new Date(),
          immutable: true,
        },
      },
      {
        incidentId: "INC-TEST-002",
        type: "fire",
        severity: 3,
        status: "in_progress",
        source: {
          originNodeId: "edge-node-2",
          detectionMethod: "ai",
          detectedAt: new Date(),
        },
        location: {
          type: "Point",
          coordinates: [11.0000, 35.5000],
          regionCode: "REG-002",
        },
        traversalPath: [],
        baseReceipt: {
          baseNodeId: "base-1",
          receivedAt: new Date(),
          processingStatus: "processing",
        },
        payload: {
          summary: "Another test incident",
        },
        audit: {
          createdAt: new Date(),
          updatedAt: new Date(),
          immutable: true,
        },
      },
    ];

    const result = await IncidentModel.insertMany(docs, { ordered: false });
    console.log(`✅ Inserted ${result.length} incident(s)`);
  } catch (err) {
    console.error("❌ Error running db test", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Connection closed");
  }
}

main();
