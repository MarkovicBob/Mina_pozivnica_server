import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { asyncH } from "../utils/asyncHandler.js";
import { adminCreateInvites, adminListRsvps, adminSummary } from "../controllers/invite.controller.js";

export const adminRouter = Router();

adminRouter.use(adminAuth);

adminRouter.post("/api/admin/invites", asyncH(adminCreateInvites));
adminRouter.get("/api/admin/rsvps", asyncH(adminListRsvps));
adminRouter.get("/api/admin/rsvps/summary", asyncH(adminSummary));
