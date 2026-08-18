import mongoose, { Schema } from "mongoose";

export const DOCUMENT_CATEGORIES = [
  "meeting_notice",
  "agm",
  "rules",
  "invoice",
  "maintenance",
  "circular",
  "financial_report",
  "other",
] as const;

const documentSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: DOCUMENT_CATEGORIES, required: true, index: true },
    description: { type: String, default: "" },
    fileName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    storageProvider: {
      type: String,
      enum: ["external_url", "local", "s3", "cloudinary"],
      default: "external_url",
    },
    storageKey: { type: String, default: "" },
    url: { type: String, default: "" },
    visibleToResidents: { type: Boolean, default: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

documentSchema.index({ societyId: 1, category: 1, createdAt: -1 });

export const SocietyDocument = mongoose.model("SocietyDocument", documentSchema);
