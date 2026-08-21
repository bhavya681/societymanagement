import mongoose, { Schema } from "mongoose";

export const MONTH_CLOSING_STATUSES = ["OPEN", "CLOSED", "REOPENED"] as const;

const monthClosingSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    billingMonth: { type: Number, required: true, min: 1, max: 12 },
    billingYear: { type: Number, required: true },
    status: { type: String, enum: MONTH_CLOSING_STATUSES, default: "OPEN", index: true },
    closedAt: { type: Date, default: null },
    closedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reopenedAt: { type: Date, default: null },
    reopenedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, default: "" },
    totalBilled: { type: Number, default: 0 },
    totalCollected: { type: Number, default: 0 },
    totalOutstanding: { type: Number, default: 0 },
    totalPenalty: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
  },
  { timestamps: true },
);

monthClosingSchema.index({ societyId: 1, billingYear: 1, billingMonth: 1 }, { unique: true });

export const MonthClosing = mongoose.model("MonthClosing", monthClosingSchema);
