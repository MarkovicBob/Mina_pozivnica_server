import mongoose from "mongoose";
import crypto from "crypto";
import { toSearchKey } from "../utils/normalize.js";

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true }
});

const InviteSchema = new mongoose.Schema({
  familyName: { type: String, required: true },
  members: { type: [MemberSchema], default: [] },
  email: String,
  phone: String,
  seats: Number,
  invitationCode: { type: String, unique: true },
  status: { type: String, enum: ["pending","accepted","declined"], default: "pending" },
  attendeesCount: { type: Number, default: 0 },
  adultCount: { type: Number, default: 0 },
  childCount: { type: Number, default: 0 },
  message: String,
  respondedAt: Date,
  searchKey: { type: String, index: true }
}, { timestamps: true });

InviteSchema.pre("save", function(next) {
  if (!this.invitationCode) {
    this.invitationCode = crypto.randomBytes(3).toString("base64url"); // 4–6 znaka
  }
  const names = [this.familyName, ...this.members.map(m => m.name)].join(" ");
  this.searchKey = toSearchKey(names);
  next();
});

export const Invite = mongoose.model("Invite", InviteSchema);
