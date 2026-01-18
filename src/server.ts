import http from "http";
import dotenv from "dotenv";
import app from "./app";
import { connectMongoose, mongoose } from "./db/mongooseClient";
import { closeIncidentsStream } from "./streams/incidents.stream";

dotenv.config();

const port = process.env.PORT || 3001;
let server: http.Server | null = null;

async function start() {
  await connectMongoose();

  server = http.createServer(app);
  server.listen(port, () => {
    // Minimal startup log
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${port}`);
  });
}

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`Shutting down on ${signal}`);

  try {
    await closeIncidentsStream();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to close incidents stream", err);
  }

  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  }

  try {
    await mongoose.connection.close();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to close MongoDB connection", err);
  }

  process.exit(0);
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
