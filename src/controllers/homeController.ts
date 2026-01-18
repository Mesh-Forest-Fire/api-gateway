import { Request, Response } from "express";

// Simple controller demonstrating MVC separation
export function getRoot(req: Request, res: Response): void {
    const status = { message: "API is running" };
  res.json(status);
}
