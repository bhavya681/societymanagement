/** All monetary storage uses integer paise (1 INR = 100 paise). */

export function rupeesToPaise(rupees: number): number {
  if (typeof rupees !== "number" || !Number.isFinite(rupees)) {
    throw new Error("Invalid rupee amount");
  }
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

export function assertNonNegativePaise(paise: number, label = "Amount"): void {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(`${label} must be a non-negative integer amount in paise`);
  }
}

export function computeBillTotalPaise(input: {
  baseAmount: number;
  additionalCharges: number;
  penalty: number;
  discount: number;
}): number {
  const total = input.baseAmount + input.additionalCharges + input.penalty - input.discount;
  return Math.max(0, total);
}

export function toPublicRupees<T extends Record<string, unknown>>(
  doc: T,
  fields: string[],
): T {
  const copy = { ...doc };
  for (const field of fields) {
    const value = copy[field];
    if (typeof value === "number") {
      (copy as Record<string, unknown>)[field] = paiseToRupees(value);
    }
  }
  return copy;
}
