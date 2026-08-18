import mongoose, { Schema } from "mongoose";

export const ANNOUNCEMENT_CATEGORIES = [
  "general",
  "maintenance",
  "emergency",
  "event",
  "security",
  "water",
  "electricity",
  "meeting",
] as const;

export const ANNOUNCEMENT_PRIORITIES = ["NORMAL", "IMPORTANT", "URGENT"] as const;
export const ANNOUNCEMENT_STATUSES = ["DRAFT", "PUBLISHED", "EXPIRED", "ARCHIVED"] as const;

const announcementSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: String, enum: ANNOUNCEMENT_CATEGORIES, default: "general", index: true },
    priority: { type: String, enum: ANNOUNCEMENT_PRIORITIES, default: "NORMAL" },
    publishDate: { type: Date, required: true, index: true },
    expiryDate: { type: Date, default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attachments: [{ type: String }],
    status: { type: String, enum: ANNOUNCEMENT_STATUSES, default: "PUBLISHED", index: true },
    pinned: { type: Boolean, default: false },
    important: { type: Boolean, default: false },
  },
  { timestamps: true },
);

announcementSchema.index({ societyId: 1, publishDate: -1, expiryDate: 1 });
announcementSchema.index({ societyId: 1, pinned: -1, publishDate: -1 });

export const Announcement = mongoose.model("Announcement", announcementSchema);
