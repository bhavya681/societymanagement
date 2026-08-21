import mongoose, { Schema } from "mongoose";

export const INCOME_CATEGORIES = [
  "parking",
  "hall_booking",
  "interest",
  "advertisement",
  "noc",
  "transfer_fees",
  "clubhouse",
  "penalty",
  "other",
] as const;

const incomeSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: INCOME_CATEGORIES, required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    payer: { type: String, default: "" },
    reference: { type: String, default: "" },
    incomeDate: { type: Date, required: true, index: true },
    paymentMethod: { type: String, default: "BANK_TRANSFER" },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

incomeSchema.index({ societyId: 1, incomeDate: -1 });
incomeSchema.index({ societyId: 1, category: 1, incomeDate: -1 });

export const Income = mongoose.model("Income", incomeSchema);
