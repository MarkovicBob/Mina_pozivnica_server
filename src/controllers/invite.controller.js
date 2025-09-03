import { Invite } from "../models/Invite.js";
import { toSearchKey } from "../utils/normalize.js";

/** GET /api/invites/search?q=... */
export async function searchInvites(req, res) {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);
  const rx = new RegExp(toSearchKey(q));
  const list = await Invite.find({ searchKey: rx })
    .select("familyName members invitationCode status")
    .limit(10)
    .lean();
  res.json(list);
}

/** GET /api/invites/by-code/:code */
export async function getByCode(req, res) {
  const inv = await Invite.findOne({ invitationCode: req.params.code })
    .select("familyName members seats status attendeesCount respondedAt")
    .lean();
  if (!inv) return res.status(404).json({ error: "Not found" });
  res.json(inv);
}

/** POST /api/rsvp */
export async function rsvp(req, res) {
  const { code, status, attendeesCount, message } = req.body || {};
  if (!code || !["accepted","declined"].includes(status)) {
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
}

/** POST /api/admin/invites */
export async function adminCreateInvites(req, res) {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: "No items" });

  const createdIds = [];
  for (const raw of items) {
    const doc = new Invite(raw);
    await doc.save();
    createdIds.push(doc._id.toString());
  }
  res.json({ count: createdIds.length, ids: createdIds });
}

/** GET /api/admin/rsvps */
export async function adminListRsvps(req, res) {
  const status = (req.query.status || "all").toLowerCase();
  const filter = (["accepted","declined","pending"].includes(status)) ? { status } : {};
  const docs = await Invite.find(filter)
    .select("familyName members seats status attendeesCount message respondedAt invitationCode")
    .sort({ status: 1, familyName: 1 })
    .lean();
  res.json(docs);
}

/** GET /api/admin/rsvps/summary */
export async function adminSummary(req, res) {
  const all = await Invite.find().select("status seats attendeesCount").lean();
  let accepted = 0, declined = 0, pending = 0;
  let totalSeats = 0, totalAttendees = 0;

  for (const d of all) {
    totalSeats += d.seats || 0;
    if (d.status === "accepted") { accepted++; totalAttendees += d.attendeesCount || 0; }
    else if (d.status === "declined") { declined++; }
    else { pending++; }
  }

  res.json({
    totalFamilies: all.length,
    acceptedFamilies: accepted,
    declinedFamilies: declined,
    pendingFamilies: pending,
    totalSeats,
    totalAttendees,
    acceptanceRate: all.length ? +(accepted / all.length * 100).toFixed(1) : 0
  });
}
