import { z } from "zod";

export const generateBillsSchema = z.object({
  billingMonth: z.number().int().min(1).max(12),
  billingYear: z.number().int().min(2020).max(2100),
  dueDate: z.string().or(z.date()),
  baseAmount: z.number().min(0).optional(),
  additionalChargeItems: z
    .array(z.object({ label: z.string().min(1), amount: z.number().min(0) }))
    .optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
  flatIds: z.array(z.string()).optional(),
  billKind: z.enum(["MAINTENANCE", "ADDITIONAL"]).optional(),
});

export const updateBillSchema = z.object({
  additionalChargeItems: z
    .array(z.object({ label: z.string().min(1), amount: z.number().min(0) }))
    .optional(),
  discount: z.number().min(0).optional(),
  penalty: z.number().min(0).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"]).optional(),
});

export const billPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "ONLINE"]),
  transactionId: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
});
