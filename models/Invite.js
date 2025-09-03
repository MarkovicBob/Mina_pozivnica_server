
import mongoose from "mongoose";
import crypto from "crypto";

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true }
});

const InviteSchema = new mongoose.Schema(
  {
    familyName: { type: String, required: true },     // npr. "Porodica Marković"
    members: { type: [MemberSchema], default: [] },   // ["Boban", "Dijana", "Mina"]
    email: String,
    phone: String,
    seats: Number,                                     // koliko mesta rezervišeš
    invitationCode: { type: String, unique: true },    // npr. "mk8y3f"
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending"
    },
    attendeesCount: { type: Number, default: 0 },
    adultCount: { type: Number, default: 0 },
    childCount: { type: Number, default: 0 },
    message: String,
    respondedAt: Date,

    // za brzo pretraživanje bez kvačica (š/đ/č/ć/ž) i bez razmaka
    searchKey: { type: String, index: true }
  },
  { timestamps: true }
);

// Normalizacija srpskih slova (latinica + ćirilica u latinicu)
function toSearchKey(s = "") {
  const cirToLat = {
    а:"a",б:"b",в:"v",г:"g",д:"d",ђ:"dj",е:"e",ж:"z",з:"z",и:"i",
    ј:"j",к:"k",л:"l",љ:"lj",м:"m",н:"n",њ:"nj",о:"o",п:"p",р:"r",
    с:"s",т:"t",ћ:"c",у:"u",ф:"f",х:"h",ц:"c",ч:"c",џ:"dz",ш:"s"
  };
  const lat = s.toLowerCase()
    .split("").map(ch => cirToLat[ch] ?? ch).join("")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // skini dijakritike
    .replace(/đ/g, "dj").replace(/š/g,"s").replace(/ž/g,"z")
    .replace(/č|ć/g,"c")
    .replace(/\s+/g, "");
  return lat;
}

InviteSchema.pre("save", function(next) {
  if (!this.invitationCode) {
    this.invitationCode = crypto.randomBytes(3).toString("base64url"); // 4-6 zn
  }
  const names = [
    this.familyName,
    ...this.members.map(m => m.name)
  ].join(" ");
  this.searchKey = toSearchKey(names);
  next();
});

InviteSchema.methods.setStatus = function(status, req) {
  this.status = status;
  this.adultCount = status === "accepted" ? Math.max(0, +req.body.adultCount || 0) : 0;
  this.childCount = status === "accepted" ? Math.max(0, +req.body.childCount || 0) : 0;
  this.attendeesCount = this.adultCount + this.childCount;
};

export default mongoose.model("Invite", InviteSchema);