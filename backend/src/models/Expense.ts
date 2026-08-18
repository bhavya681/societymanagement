import mongoose, { Schema } from "mongoose";

export const EXPENSE_CATEGORIES = [
  "electricity",
  "water",
  "security",
  "housekeeping",
  "repairs",
  "lift",
  "gardening",
  "plumbing",
  "painting",
  "insurance",
  "staff",
  "administrative",
  "other",
] as const;

export const EXPENSE_STATUSES = ["PENDING", "PAID", "CANCELLED"] as const;

const expenseSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true, index: true },
    description: { type: String, default: "" },
    amount: { type: Number, required: true, min: 1 },
    vendor: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },
    expenseDate: { type: Date, required: true, index: true },
    paymentMethod: { type: String, default: "BANK_TRANSFER" },
    status: { type: String, enum: EXPENSE_STATUSES, default: "PAID", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

expenseSchema.index({ societyId: 1, expenseDate: -1 });
expenseSchema.index({ societyId: 1, category: 1, expenseDate: -1 });

export const Expense = mongoose.model("Expense", expenseSchema);
