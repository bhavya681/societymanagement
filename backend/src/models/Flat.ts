import mongoose, { Schema } from "mongoose";

export const FLAT_TYPES = ["1BHK", "2BHK", "3BHK", "4BHK", "COMMERCIAL"] as const;
export const OWNERSHIP_STATUSES = ["OWNER_OCCUPIED", "TENANT_OCCUPIED", "VACANT"] as const;
export const FLAT_STATUSES = ["ACTIVE", "INACTIVE"] as const;

const flatSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true, index: true },
    flatNumber: { type: String, required: true, trim: true },
    floor: { type: Number, required: true },
    type: { type: String, enum: FLAT_TYPES, required: true },
    area: { type: Number, default: 0 },
    ownershipStatus: { type: String, enum: OWNERSHIP_STATUSES, default: "VACANT", index: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", default: null },
    occupants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    parkingSpaces: { type: Number, default: 0 },
    status: { type: String, enum: FLAT_STATUSES, default: "ACTIVE" },
  },
  { timestamps: true },
);

flatSchema.index({ societyId: 1, buildingId: 1, flatNumber: 1 }, { unique: true });
flatSchema.index({ societyId: 1, owner: 1 });

export const Flat = mongoose.model("Flat", flatSchema);
