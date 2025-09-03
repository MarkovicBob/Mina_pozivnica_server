import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import Invite from "./models/Invite.js";
import chalk from "chalk";

/* ------------------------- helpers ------------------------- */
const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------- app init ------------------------- */
const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? "*" : CORS_ORIGIN.split(",").map(s => s.trim()),
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(compression());
app.use(express.json({ limit: "1mb" }));

app.use("/api/rsvp", rateLimit({ windowMs: 60_000, max: 5 }));

/* ------------------------- routes ------------------------- */

// health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// 1) Auto-complete pretraga: ?q=mar
app.get("/api/invites/search", asyncH(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);

  const key = q
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj").replace(/š/g, "s").replace(/ž/g, "z")
    .replace(/č|ć/g, "c").replace(/\s+/g, "");

  // ▼ PRETRAGA "SADRŽI" (uklonjen ^ da bi nalazilo i "Marković" i sl.)
  const rx = new RegExp(key);

  const list = await Invite.find({ searchKey: rx })
    .select("familyName members invitationCode status")
    .limit(10)
    .lean();

  res.json(list);
}));

// 2) Preuzmi podatke o pozivu po kodu (prefill forme)
app.get("/api/invites/by-code/:code", asyncH(async (req, res) => {
  const inv = await Invite.findOne({ invitationCode: req.params.code })
    .select("familyName members seats status attendeesCount respondedAt")
    .lean();

  if (!inv) return res.status(404).json({ error: "Not found" });
  res.json(inv);
}));

// 3) RSVP – potvrda/odbijanje (jednokratno zaključavanje)
app.post("/api/rsvp", asyncH(async (req, res) => {
  const { code, status, attendeesCount, message } = req.body || {};
  if (!code || !["accepted", "declined"].includes(status)) {
    return res.status(400).json({ error: "Bad request" });
  }

  const inv = await Invite.findOne({ invitationCode: code });
  if (!inv) return res.status(404).json({ error: "Invite not found" });

  if (inv.status !== "pending") {
    return res.status(409).json({
      error: "Already responded",
      status: inv.status,
      respondedAt: inv.respondedAt,
    });
  }

  inv.status = status;
  inv.attendeesCount = status === "accepted" ? Math.max(0, Number(attendeesCount) || 0) : 0;
  inv.message = message || "";
  inv.respondedAt = new Date();
  await inv.save();

  res.json({ ok: true });
}));

// (Admin) kreiraj invite-e
app.post("/api/admin/invites", asyncH(async (req, res) => {
  if (!ADMIN_TOKEN || req.headers["x-admin-token"] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: "No items" });

  const createdIds = [];
  for (const raw of items) {
    const doc = new Invite(raw); // .save() da bi radili pre('save') hookovi
    await doc.save();
    createdIds.push(doc._id.toString());
  }
  res.json({ count: createdIds.length, ids: createdIds });
}));

// LISTA RSVP-ova (accepted|declined|pending|all)
app.get("/api/admin/rsvps", asyncH(async (req, res) => {
  if (!ADMIN_TOKEN || req.headers["x-admin-token"] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const status = (req.query.status || "all").toLowerCase();
  const filter = (["accepted","declined","pending"].includes(status)) ? { status } : {};

  const docs = await Invite.find(filter)
    .select("familyName members seats status attendeesCount message respondedAt invitationCode")
    .sort({ status: 1, familyName: 1 })
    .lean();

  res.json(docs);
}));

// SAŽETAK (brojevi i total)
app.get("/api/admin/rsvps/summary", asyncH(async (req, res) => {
  if (!ADMIN_TOKEN || req.headers["x-admin-token"] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const all = await Invite.find().select("status seats attendeesCount").lean();
  let accepted = 0, declined = 0, pending = 0;
  let totalSeats = 0, totalAttendees = 0;

  for (const d of all) {
    totalSeats += d.seats || 0;
    if (d.status === "accepted") { accepted++; totalAttendees += d.attendeesCount || 0; }
    else if (d.status === "declined") { declined++; }
    else { pending++; }
  }

  const summary = {
    totalFamilies: all.length,
    acceptedFamilies: accepted,
    declinedFamilies: declined,
    pendingFamilies: pending,
    totalSeats,
    totalAttendees,
    acceptanceRate: all.length ? +(accepted / all.length * 100).toFixed(1) : 0
  };

  res.json(summary);
}));

/* ------------------------- 404 & errors ------------------------- */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});



/* ------------------------- start ------------------------- */
async function start() {
  try {
    await mongoose.connect(MONGO_URL, {
      autoCreate: true,
      serverSelectionTimeoutMS: 8000,
    });
    console.log(chalk.yellow("✅ MongoDB connected"));
    app.listen(PORT, () => console.log(chalk.blue(`🚀 API on http://localhost:${PORT}`)));
  } catch (e) {
    console.error("Mongo connect failed:", e);
    process.exit(1);
  }
}

process.on("unhandledRejection", (e) => {
  console.error("unhandledRejection:", e);
});
process.on("uncaughtException", (e) => {
  console.error("uncaughtException:", e);
});

start();
