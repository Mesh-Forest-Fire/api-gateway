import { Request, Response } from "express";
import { getExpectedCredentials } from "../middleware/auth";

function isAuthEnabled(): boolean {
  return String(process.env.AUTH_ENABLED || "").toLowerCase() === "true";
}

export function postLogin(req: Request, res: Response): void {
  const body = (req.body || {}) as { username?: unknown; password?: unknown };
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    res.status(400).json({ approved: false, reason: "missing_credentials" });
    return;
  }

  if (!isAuthEnabled()) {
    res.status(200).json({ approved: true, reason: "auth_disabled" });
    return;
  }

  const expected = getExpectedCredentials();
  if (!expected) {
    res.status(500).json({ approved: false, reason: "credentials_not_configured" });
    return;
  }

  const approved = username === expected.username && password === expected.password;
  res.status(200).json({ approved });
}
