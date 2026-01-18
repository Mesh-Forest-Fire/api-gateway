import fs from "fs";
import path from "path";
import { connectMongoose, mongoose } from "../src/db/mongooseClient";
import { IncidentModel } from "../src/models/incident";

interface TraversalHop {
  hopIndex: number;
  nodeId: string;
  nodeType: "edge" | "relay" | "regional" | "base";
  receivedAt: string;
  forwardedAt?: string;
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
}

interface TraversalSeed {
  incidentId: string;
  traversalPath: TraversalHop[];
}

async function main() {
  try {
    await connectMongoose();
    console.log("✅ Connected to MongoDB");

    const rootDir = path.resolve(__dirname, "..");
    const incidentsPath = path.join(rootDir, "seed-data", "incidents.json");
    const traversalPath = path.join(rootDir, "seed-data", "traversalHops.json");

    const incidentsRaw = fs.readFileSync(incidentsPath, "utf-8");
    const traversalRaw = fs.readFileSync(traversalPath, "utf-8");

    const incidents = JSON.parse(incidentsRaw);
    const traversalSeeds: TraversalSeed[] = JSON.parse(traversalRaw);

    const traversalByIncident = new Map<string, TraversalHop[]>();
    for (const t of traversalSeeds) {
      traversalByIncident.set(t.incidentId, t.traversalPath);
    }

    const docs = incidents.map((inc: any) => {
      const hops = traversalByIncident.get(inc.incidentId) || [];
      return {
        ...inc,
        traversalPath: hops.map((h) => ({
          ...h,
          receivedAt: new Date(h.receivedAt),
          forwardedAt: h.forwardedAt ? new Date(h.forwardedAt) : undefined,
        })),
      };
    });

    const ids = docs.map((d: any) => d.incidentId);
    await IncidentModel.deleteMany({ incidentId: { $in: ids } });

    const result = await IncidentModel.insertMany(docs, { ordered: false });
    console.log(`✅ Wrote ${result.length} incident(s) from JSON seed data`);
  } catch (err) {
    console.error("❌ Error writing seed data", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Connection closed");
  }
}

main();