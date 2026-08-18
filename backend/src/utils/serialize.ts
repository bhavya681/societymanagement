import { paiseToRupees } from "./money";

const MONEY_FIELDS = new Set([
  "baseAmount",
  "additionalCharges",
  "penalty",
  "discount",
  "totalAmount",
  "paidAmount",
  "remainingAmount",
  "amount",
  "maxPenalty",
  "fixedPenalty",
  "currentDue",
  "overdueAmount",
  "totalCollected",
  "totalPending",
  "totalOverdue",
  "totalExpenses",
  "currentBalance",
  "penaltiesCollected",
  "totalBilled",
  "totalPaid",
  "outstanding",
  "overdue",
]);

export function lean<T>(doc: { toObject?: () => T } | T | null | undefined): T | null {
  if (!doc) return null;
  if (typeof (doc as { toObject?: () => T }).toObject === "function") {
    return (doc as { toObject: () => T }).toObject();
  }
  return doc as T;
}

function convertValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (MONEY_FIELDS.has(key) && typeof value === "number") {
    return paiseToRupees(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "_bsontype" in (value as object)) {
    return String(value);
  }
  if (Array.isArray(value)) return value.map((item) => convertDeep(item));
  if (typeof value === "object") return convertDeep(value as Record<string, unknown>);
  return value;
}

export function convertDeep(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(convertDeep);
  if (typeof input !== "object") return input;
  if (input instanceof Date) return input.toISOString();
  const obj = input as Record<string, unknown>;
  if (typeof obj.toJSON === "function" && obj._id) {
    return convertDeep(JSON.parse(JSON.stringify(obj)));
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "passwordHash") continue;
    if (key === "__v") continue;
    if (key === "_id") {
      out.id = String(value);
      continue;
    }
    out[key] = convertValue(key, value);
  }
  return out;
}

export function publicDoc(doc: unknown): Record<string, unknown> {
  return convertDeep(JSON.parse(JSON.stringify(doc))) as Record<string, unknown>;
}
