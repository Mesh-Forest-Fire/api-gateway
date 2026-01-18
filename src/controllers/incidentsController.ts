import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
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
