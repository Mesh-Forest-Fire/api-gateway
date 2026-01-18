"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mongooseClient_1 = require("../src/db/mongooseClient");
const incident_1 = require("../src/models/incident");
async function main() {
    try {
        await (0, mongooseClient_1.connectMongoose)();
        console.log("✅ Connected to MongoDB");
        const rootDir = path_1.default.resolve(__dirname, "..");
        const incidentsPath = path_1.default.join(rootDir, "seed-data", "incidents.json");
        const traversalPath = path_1.default.join(rootDir, "seed-data", "traversalHops.json");
        const incidentsRaw = fs_1.default.readFileSync(incidentsPath, "utf-8");
        const traversalRaw = fs_1.default.readFileSync(traversalPath, "utf-8");
        const incidents = JSON.parse(incidentsRaw);
        const traversalSeeds = JSON.parse(traversalRaw);
        const traversalByIncident = new Map();
        for (const t of traversalSeeds) {
            traversalByIncident.set(t.incidentId, t.traversalPath);
        }
        const docs = incidents.map((inc) => {
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
        const ids = docs.map((d) => d.incidentId);
        await incident_1.IncidentModel.deleteMany({ incidentId: { $in: ids } });
        const result = await incident_1.IncidentModel.insertMany(docs, { ordered: false });
        console.log(`✅ Wrote ${result.length} incident(s) from JSON seed data`);
    }
    catch (err) {
        console.error("❌ Error writing seed data", err);
    }
    finally {
        await mongooseClient_1.mongoose.connection.close();
        console.log("🔌 Connection closed");
    }
}
main();
