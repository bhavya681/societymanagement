import mongoose, { Schema } from "mongoose";

const announcementReadSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    announcementId: { type: Schema.Types.ObjectId, ref: "Announcement", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    readAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

announcementReadSchema.index({ announcementId: 1, userId: 1 }, { unique: true });
announcementReadSchema.index({ userId: 1, readAt: -1 });

export const AnnouncementRead = mongoose.model("AnnouncementRead", announcementReadSchema);
