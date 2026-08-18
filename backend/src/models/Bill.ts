import mongoose, { Schema } from "mongoose";

export const BILL_STATUSES = ["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

const additionalChargeSchema = new Schema(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const billSchema = new Schema(
  {
    billNumber: { type: String, required: true, unique: true },
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    flatId: { type: Schema.Types.ObjectId, ref: "Flat", required: true, index: true },
    residentId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    billingMonth: { type: Number, required: true, min: 1, max: 12 },
    billingYear: { type: Number, required: true },
    billKind: { type: String, enum: ["MAINTENANCE", "ADDITIONAL"], default: "MAINTENANCE" },
    baseAmount: { type: Number, required: true, min: 0 },
    additionalCharges: { type: Number, default: 0, min: 0 },
    additionalChargeItems: { type: [additionalChargeSchema], default: [] },
    penalty: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true, index: true },
    status: { type: String, enum: BILL_STATUSES, default: "PENDING", index: true },
    notes: { type: String, default: "" },
    penaltyAppliedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

billSchema.index({ societyId: 1, status: 1, billingYear: 1, billingMonth: 1 });
billSchema.index({ societyId: 1, residentId: 1, status: 1 });
billSchema.index(
  { societyId: 1, flatId: 1, billingMonth: 1, billingYear: 1 },
  {
    unique: true,
    partialFilterExpression: { billKind: "MAINTENANCE", status: { $ne: "CANCELLED" } },
    name: "unique_active_maintenance_bill",
  },
);

export const Bill = mongoose.model("Bill", billSchema);
