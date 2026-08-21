import mongoose, { Schema } from "mongoose";

export const RECURRING_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
export const RECURRING_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as const;

const recurringExpenseSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    expectedAmount: { type: Number, required: true, min: 1 },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
    frequency: { type: String, enum: RECURRING_FREQUENCIES, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    nextDueDate: { type: Date, required: true, index: true },
    paymentMethod: { type: String, default: "BANK_TRANSFER" },
    status: { type: String, enum: RECURRING_STATUSES, default: "ACTIVE", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

recurringExpenseSchema.index({ societyId: 1, nextDueDate: 1, status: 1 });
recurringExpenseSchema.index({ societyId: 1, vendorId: 1 });

export const RecurringExpense = mongoose.model("RecurringExpense", recurringExpenseSchema);
