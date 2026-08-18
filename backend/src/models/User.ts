import mongoose, { Schema } from "mongoose";

export const USER_ROLES = [
  "ADMIN",
  "RESIDENT",
  "COMMITTEE",
  "SECRETARY",
  "CHAIRMAN",
  "ACCOUNTANT",
  "SECURITY",
  "MAINTENANCE_STAFF",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const OCCUPANCY_ROLES = ["OWNER", "TENANT", "FAMILY"] as const;
export type OccupancyRole = (typeof OCCUPANCY_ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "RESIDENT", index: true },
    status: { type: String, enum: USER_STATUSES, default: "ACTIVE", index: true },
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    flatId: { type: Schema.Types.ObjectId, ref: "Flat", default: null, index: true },
    occupancyRole: { type: String, enum: OCCUPANCY_ROLES },
    avatar: { type: String, default: "" },
    emergencyContactName: { type: String, default: "" },
    emergencyContactPhone: { type: String, default: "" },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ societyId: 1, role: 1, status: 1 });
userSchema.index({ societyId: 1, name: 1 });

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const obj = ret as Record<string, unknown>;
    obj.id = String(obj._id);
    delete obj.passwordHash;
    delete obj.__v;
    return obj;
  },
});

export const User = mongoose.model("User", userSchema);
