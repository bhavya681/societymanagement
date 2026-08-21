import mongoose, { Schema } from "mongoose";
import { generateInviteCode } from "../utils/inviteCode";

const penaltyConfigSchema = new Schema(
  {
    type: { type: String, enum: ["FIXED", "PERCENTAGE", "PER_DAY"], default: "FIXED" },
    fixedPenalty: { type: Number, default: 10000 },
    percentage: { type: Number, default: 2 },
    gracePeriodDays: { type: Number, default: 10 },
    maxPenalty: { type: Number, default: 50000 },
    autoApply: { type: Boolean, default: true },
  },
  { _id: false },
);

const privacySchema = new Schema(
  {
    showResidentPhone: { type: Boolean, default: true },
    showResidentEmail: { type: Boolean, default: false },
    showDirectoryToResidents: { type: Boolean, default: true },
  },
  { _id: false },
);

const societySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    inviteCode: { type: String, required: true, uppercase: true, trim: true, unique: true, index: true },
    registrationNumber: { type: String, default: "", trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    contactEmail: { type: String, required: true, lowercase: true },
    contactPhone: { type: String, required: true },
    logo: { type: String, default: "" },
    totalBuildings: { type: Number, default: 0 },
    totalUnits: { type: Number, default: 0 },
    financialYear: { type: String, default: "2026-27" },
    maintenanceDueDay: { type: Number, default: 10, min: 1, max: 28 },
    currency: { type: String, default: "INR" },
    defaultMaintenancePaise: { type: Number, default: 350000 },
    penaltyConfig: { type: penaltyConfigSchema, default: () => ({}) },
    privacy: { type: privacySchema, default: () => ({}) },
  },
  { timestamps: true },
);

societySchema.index({ name: 1 });
societySchema.index({ registrationNumber: 1 });

societySchema.pre("validate", function assignInviteCode() {
  if (!this.inviteCode) this.inviteCode = generateInviteCode();
});

export const Society = mongoose.model("Society", societySchema);
