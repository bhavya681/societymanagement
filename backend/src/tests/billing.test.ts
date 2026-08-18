import { describe, expect, it } from "vitest";
import { rupeesToPaise, paiseToRupees, computeBillTotalPaise } from "../utils/money";
import {
  applyPenaltyIfDue,
  calculatePenaltyPaise,
  deriveBillStatus,
  isPastGracePeriod,
} from "../services/penalty.service";

const config = {
  type: "FIXED" as const,
  fixedPenalty: rupeesToPaise(100),
  percentage: 2,
  gracePeriodDays: 10,
  maxPenalty: rupeesToPaise(500),
  autoApply: true,
};

describe("money", () => {
  it("converts rupees to paise without float drift", () => {
    expect(rupeesToPaise(3500)).toBe(350000);
    expect(rupeesToPaise(1.25)).toBe(125);
    expect(paiseToRupees(350000)).toBe(3500);
  });

  it("computes bill totals on the backend", () => {
    expect(
      computeBillTotalPaise({
        baseAmount: 350000,
        additionalCharges: 20000,
        penalty: 10000,
        discount: 5000,
      }),
    ).toBe(375000);
  });
});

describe("penalty service", () => {
  it("calculates fixed and percentage penalties with a cap", () => {
    expect(calculatePenaltyPaise(350000, config)).toBe(10000);
    expect(
      calculatePenaltyPaise(350000, { ...config, type: "PERCENTAGE", percentage: 2 }),
    ).toBe(7000);
    expect(
      calculatePenaltyPaise(1_000_000, { ...config, type: "PERCENTAGE", percentage: 10, maxPenalty: 50000 }),
    ).toBe(50000);
  });

  it("respects grace period", () => {
    const due = new Date("2026-07-10T00:00:00Z");
    expect(isPastGracePeriod(due, 10, new Date("2026-07-15T00:00:00Z"))).toBe(false);
    expect(isPastGracePeriod(due, 10, new Date("2026-07-22T00:00:00Z"))).toBe(true);
  });

  it("applies penalty only once after grace", () => {
    const due = new Date("2026-06-10");
    const first = applyPenaltyIfDue({
      dueDate: due,
      baseAmount: 350000,
      additionalCharges: 0,
      discount: 0,
      currentPenalty: 0,
      paidAmount: 0,
      status: "PENDING",
      config,
      now: new Date("2026-07-01"),
    });
    expect(first.applied).toBe(true);
    expect(first.penalty).toBe(10000);
    const second = applyPenaltyIfDue({
      ...first,
      currentPenalty: first.penalty,
      dueDate: due,
      baseAmount: 350000,
      additionalCharges: 0,
      discount: 0,
      paidAmount: 0,
      status: "OVERDUE",
      config,
      now: new Date("2026-07-15"),
    });
    expect(second.applied).toBe(false);
    expect(second.penalty).toBe(10000);
  });
});

describe("bill status", () => {
  it("marks paid, partial, pending and overdue correctly", () => {
    const future = new Date(Date.now() + 86400000 * 5);
    const past = new Date(Date.now() - 86400000 * 5);
    expect(deriveBillStatus({ totalAmount: 100, paidAmount: 100, dueDate: future, currentStatus: "PENDING" })).toBe("PAID");
    expect(deriveBillStatus({ totalAmount: 100, paidAmount: 40, dueDate: future, currentStatus: "PENDING" })).toBe("PARTIALLY_PAID");
    expect(deriveBillStatus({ totalAmount: 100, paidAmount: 0, dueDate: future, currentStatus: "PENDING" })).toBe("PENDING");
    expect(deriveBillStatus({ totalAmount: 100, paidAmount: 0, dueDate: past, currentStatus: "PENDING" })).toBe("OVERDUE");
    expect(deriveBillStatus({ totalAmount: 100, paidAmount: 40, dueDate: past, currentStatus: "PARTIALLY_PAID" })).toBe("OVERDUE");
    expect(deriveBillStatus({ totalAmount: 100, paidAmount: 0, dueDate: past, currentStatus: "CANCELLED" })).toBe("CANCELLED");
  });
});
