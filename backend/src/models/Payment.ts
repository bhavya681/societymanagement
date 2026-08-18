import mongoose, { Schema } from "mongoose";

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "ONLINE"] as const;
export const PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] as const;

const paymentSchema = new Schema(
  {
    billId: { type: Schema.Types.ObjectId, ref: "Bill", required: true, index: true },
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    residentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    flatId: { type: Schema.Types.ObjectId, ref: "Flat", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    transactionId: { type: String, default: "" },
    paymentDate: { type: Date, required: true, index: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: "SUCCESS", index: true },
    notes: { type: String, default: "" },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

paymentSchema.index({ societyId: 1, paymentDate: -1 });
paymentSchema.index({ societyId: 1, residentId: 1, paymentDate: -1 });

export const Payment = mongoose.model("Payment", paymentSchema);
