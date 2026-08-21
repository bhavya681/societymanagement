import mongoose, { Schema } from "mongoose";

export const VENDOR_CATEGORIES = [
  "security",
  "housekeeping",
  "electricity",
  "water",
  "lift",
  "generator",
  "repairs",
  "plumbing",
  "electrical",
  "garden",
  "pest_control",
  "fire_safety",
  "insurance",
  "staff_salary",
  "professional_fees",
  "office",
  "internet",
  "other",
] as const;

export const VENDOR_STATUSES = ["ACTIVE", "INACTIVE", "BLACKLISTED"] as const;

const vendorSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: VENDOR_CATEGORIES, required: true, index: true },
    contactPerson: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    gstNumber: { type: String, default: "" },
    panNumber: { type: String, default: "" },
    services: { type: [String], default: [] },
    paymentTerms: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: { type: String, enum: VENDOR_STATUSES, default: "ACTIVE", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

vendorSchema.index({ societyId: 1, name: 1 });
vendorSchema.index({ societyId: 1, category: 1, status: 1 });

export const Vendor = mongoose.model("Vendor", vendorSchema);
