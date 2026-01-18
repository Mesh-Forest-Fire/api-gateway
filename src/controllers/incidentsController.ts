import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import {v4} from "uuid";
import { IncidentModel } from "../models/incident";

export async function getIncidents(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt((req.query.page as string) || "1", 10) || 1, 1);
    const limit = Math.max(parseInt((req.query.limit as string) || "10", 10) || 10, 1);

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      IncidentModel.countDocuments({}),
      IncidentModel.find({})
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    

    return res.status(200).json({
      data,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getIncidentById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Incident not found" });
    }

    const incident = await IncidentModel.findById(id).lean();

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    return res.status(200).json(incident);
  } catch (err) {
    return next(err);
  }
}

export async function postIncident(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body || {};

    const now = new Date();

    const incidentId: string = body.incidentId || `INC-${v4().slice(0, 8).toUpperCase()}`;

    const severity: number = typeof body.severity === "number" ? body.severity : 1;
    const status: string = body.status || "open";

    const source = {
      originNodeId: body.source?.originNodeId,
      detectionMethod: body.source?.detectionMethod,
      detectedAt: body.source?.detectedAt ? new Date(body.source.detectedAt) : now,
    };

    const location = {
      type: "Point" as const,
      coordinates: body.location?.coordinates || [0, 0],
      regionCode: body.location?.regionCode,
      description: body.location?.description,
    };

    const traversalPath = Array.isArray(body.traversalPath)
      ? body.traversalPath.map((hop: any, index: number) => ({
          hopIndex: typeof hop.hopIndex === "number" ? hop.hopIndex : index,
          nodeId: hop.nodeId,
        }))
      : [];

    const baseReceipt = {
      baseNodeId: body.baseReceipt?.baseNodeId,
      receivedAt: body.baseReceipt?.receivedAt
        ? new Date(body.baseReceipt.receivedAt)
        : now,
      processingStatus: body.baseReceipt?.processingStatus || "queued",
    };

    const payload = {
      summary: body.payload?.summary,
      raw: body.payload?.raw,
      attachments: body.payload?.attachments || [],
    };

    const audit = {
      createdAt: now,
      updatedAt: now,
      immutable: true,
    };

    const doc = {
      incidentId,
      type: body.type,
      severity,
      status,
      source,
      location,
      traversalPath,
      baseReceipt,
      payload,
      audit,
    };

    const created = await IncidentModel.create(doc);

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
}
