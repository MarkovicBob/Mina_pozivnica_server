import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncH } from "../utils/asyncHandler.js";
import { searchInvites, getByCode, rsvp } from "../controllers/invite.controller.js";

export const publicRouter = Router();

// health i root
publicRouter.get("/health", (_req, res) => res.json({ ok: true }));
publicRouter.get("/", (_req, res) => res.json({ message: "Mina_pozivnica API is running 🚀" }));

// pretraga i kod
publicRouter.get("/api/invites/search", asyncH(searchInvites));
publicRouter.get("/api/invites/by-code/:code", asyncH(getByCode));

// RSVP sa rate limitom
publicRouter.post(
  "/api/rsvp",
  rateLimit({ windowMs: 60_000, max: 5 }),
  asyncH(rsvp)
);
