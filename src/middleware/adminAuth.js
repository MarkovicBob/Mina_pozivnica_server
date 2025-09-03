import { config } from "../config/env.js";

export function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!config.adminToken || token !== config.adminToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
