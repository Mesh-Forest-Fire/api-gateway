import type { Request, Response } from "express";
import { mongoose } from "../db/mongooseClient";

type ClientState = {
  res: Response;
  canWrite: boolean;
  heartbeat: NodeJS.Timeout;
};

type IncidentInsertPayload = {
  incidentId?: string;
  type?: string;
  severity?: number;
  baseReceipt?: { receivedAt?: Date };
  traversalPath?: unknown[];
};

const clients = new Set<ClientState>();
let stream: ReturnType<typeof mongoose.connection.watch> | null = null;

function writeSse(res: Response, event: string, data: unknown) {
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
  return res.write(payload);
}

function startChangeStream() {
  if (stream) {
    return;
  }

  stream = mongoose.connection.watch(
    [
      {
        $match: {
          operationType: "insert",
          "ns.coll": "incidents",
        },
      },
    ],
    { fullDocument: "default" }
  );

  if (!stream) {
    return;
  }

  stream.on("change", (change: any) => {
    if (change.operationType !== "insert") {
      return;
    }

    const doc = change.fullDocument as IncidentInsertPayload | undefined;
    if (!doc) {
      return;
    }

    const payload = {
      incidentId: doc.incidentId,
      type: doc.type,
      severity: doc.severity,
      baseReceiptReceivedAt: doc.baseReceipt?.receivedAt || null,
      traversalPathLength: Array.isArray(doc.traversalPath) ? doc.traversalPath.length : 0,
    };

    for (const client of clients) {
      if (!client.canWrite || client.res.writableEnded) {
        continue;
      }

      const ok = writeSse(client.res, "incident", payload);
      if (!ok) {
        client.canWrite = false;
        client.res.once("drain", () => {
          client.canWrite = true;
        });
      }
    }
  });

  stream.on("error", () => {
    if (stream) {
      stream.removeAllListeners();
      stream.close().catch(() => undefined);
      stream = null;
    }
  });
}

function stopChangeStreamIfIdle() {
  if (clients.size > 0 || !stream) {
    return;
  }

  stream.removeAllListeners();
  stream.close().catch(() => undefined);
  stream = null;
}

export function incidentsStreamHandler(req: Request, res: Response) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.write(`: stream opened\n\n`);
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": heartbeat\n\n");
    }
  }, 15000);

  const client: ClientState = {
    res,
    canWrite: true,
    heartbeat,
  };

  clients.add(client);
  startChangeStream();

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(client);
    stopChangeStreamIfIdle();
  });
}

export async function closeIncidentsStream() {
  for (const client of clients) {
    clearInterval(client.heartbeat);
    if (!client.res.writableEnded) {
      client.res.end();
    }
  }
  clients.clear();

  if (stream) {
    stream.removeAllListeners();
    await stream.close();
    stream = null;
  }
}
