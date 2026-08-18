import mongoose, { Schema } from "mongoose";

export const REQUEST_CATEGORIES = [
  "plumbing",
  "electrical",
  "lift",
  "water",
  "security",
  "cleaning",
  "parking",
  "structural",
  "internet",
  "other",
] as const;

export const REQUEST_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const REQUEST_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "ON_HOLD",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
] as const;

const commentSchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    message: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const requestSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    flatId: { type: Schema.Types.ObjectId, ref: "Flat", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: REQUEST_CATEGORIES, required: true, index: true },
    description: { type: String, required: true },
    priority: { type: String, enum: REQUEST_PRIORITIES, default: "MEDIUM", index: true },
    location: { type: String, default: "" },
    attachments: [{ type: String }],
    status: { type: String, enum: REQUEST_STATUSES, default: "OPEN", index: true },
    comments: { type: [commentSchema], default: [] },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

requestSchema.index({ societyId: 1, status: 1, priority: 1, createdAt: -1 });
requestSchema.index({ societyId: 1, createdBy: 1, createdAt: -1 });

export const MaintenanceRequest = mongoose.model("MaintenanceRequest", requestSchema);
