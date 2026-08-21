import { computeBillTotalPaise } from "../utils/money";

export interface PenaltyConfig {
  type: "FIXED" | "PERCENTAGE" | "PER_DAY";
  fixedPenalty: number;
  percentage: number;
  gracePeriodDays: number;
  maxPenalty: number;
  autoApply?: boolean;
}

export function isPastGracePeriod(dueDate: Date, gracePeriodDays: number, now = new Date()): boolean {
  const graceEnd = new Date(dueDate);
  graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);
  graceEnd.setHours(23, 59, 59, 999);
  return now.getTime() > graceEnd.getTime();
}

function lateDays(dueDate: Date, referenceDate: Date): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const diff = Math.floor((ref.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function calculatePenaltyPaise(
  baseAmountPaise: number,
  config: PenaltyConfig,
  referenceDate?: Date,
  dueDate?: Date,
): number {
  let raw = 0;
  if (config.type === "PERCENTAGE") {
    raw = Math.round((baseAmountPaise * config.percentage) / 100);
  } else if (config.type === "PER_DAY") {
    const days = dueDate ? lateDays(dueDate, referenceDate ?? new Date()) : 0;
    raw = days * config.fixedPenalty;
  } else {
    raw = config.fixedPenalty;
  }
  return Math.min(Math.max(0, raw), config.maxPenalty);
}

export function applyPenaltyIfDue(input: {
  dueDate: Date;
  baseAmount: number;
  additionalCharges: number;
  discount: number;
  currentPenalty: number;
  paidAmount: number;
  status: string;
  config: PenaltyConfig;
  now?: Date;
  paymentDate?: Date;
}) {
  if (input.status === "PAID" || input.status === "CANCELLED") {
    return {
      penalty: input.currentPenalty,
      applied: false,
      totalAmount: computeBillTotalPaise({
        baseAmount: input.baseAmount,
        additionalCharges: input.additionalCharges,
        penalty: input.currentPenalty,
        discount: input.discount,
      }),
    };
  }

  if (!input.config.autoApply) {
    return {
      penalty: input.currentPenalty,
      applied: false,
      totalAmount: computeBillTotalPaise({
        baseAmount: input.baseAmount,
        additionalCharges: input.additionalCharges,
        penalty: input.currentPenalty,
        discount: input.discount,
      }),
    };
  }

  if (input.currentPenalty > 0) {
    return {
      penalty: input.currentPenalty,
      applied: false,
      totalAmount: computeBillTotalPaise({
        baseAmount: input.baseAmount,
        additionalCharges: input.additionalCharges,
        penalty: input.currentPenalty,
        discount: input.discount,
      }),
    };
  }

  const referenceDate = input.paymentDate ?? input.now ?? new Date();
  if (!isPastGracePeriod(input.dueDate, input.config.gracePeriodDays, referenceDate)) {
    return {
      penalty: 0,
      applied: false,
      totalAmount: computeBillTotalPaise({
        baseAmount: input.baseAmount,
        additionalCharges: input.additionalCharges,
        penalty: 0,
        discount: input.discount,
      }),
    };
  }

  const chargeableBase = input.baseAmount + input.additionalCharges;
  const penalty = calculatePenaltyPaise(chargeableBase, input.config, referenceDate, input.dueDate);
  return {
    penalty,
    applied: penalty > 0,
    totalAmount: computeBillTotalPaise({
      baseAmount: input.baseAmount,
      additionalCharges: input.additionalCharges,
      penalty,
      discount: input.discount,
    }),
  };
}

export function deriveBillStatus(input: {
  totalAmount: number;
  paidAmount: number;
  dueDate: Date;
  currentStatus: string;
  now?: Date;
}): "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED" {
  if (input.currentStatus === "CANCELLED") return "CANCELLED";
  if (input.paidAmount >= input.totalAmount && input.totalAmount > 0) return "PAID";
  if (input.paidAmount >= input.totalAmount && input.totalAmount === 0) return "PAID";
  const now = input.now ?? new Date();
  const overdue = now.getTime() > new Date(input.dueDate).getTime() && input.paidAmount < input.totalAmount;
  if (input.paidAmount > 0 && input.paidAmount < input.totalAmount) {
    return overdue ? "OVERDUE" : "PARTIALLY_PAID";
  }
  return overdue ? "OVERDUE" : "PENDING";
}
