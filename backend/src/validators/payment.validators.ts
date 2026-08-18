import { z } from "zod";

export const createPaymentSchema = z.object({
  billId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "ONLINE"]),
  transactionId: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
});

export const createExpenseSchema = z.object({
  title: z.string().min(2),
  category: z.enum([
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
  ]),
  description: z.string().optional(),
  amount: z.number().positive(),
  vendor: z.string().optional(),
  invoiceNumber: z.string().optional(),
  expenseDate: z.string(),
  paymentMethod: z.string().optional(),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const createBuildingSchema = z.object({
  name: z.string().min(1),
  numberOfFloors: z.number().int().min(1),
});

export const createFlatSchema = z.object({
  buildingId: z.string().min(1),
  flatNumber: z.string().min(1),
  floor: z.number().int().min(0),
  type: z.enum(["1BHK", "2BHK", "3BHK", "4BHK", "COMMERCIAL"]),
  area: z.number().min(0).optional(),
  parkingSpaces: z.number().min(0).optional(),
  ownershipStatus: z.enum(["OWNER_OCCUPIED", "TENANT_OCCUPIED", "VACANT"]).optional(),
  owner: z.string().nullable().optional(),
});

export const updateFlatSchema = createFlatSchema.partial().extend({
  occupants: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const updateSocietySchema = z.object({
  name: z.string().min(2).optional(),
  registrationNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  logo: z.string().optional(),
  financialYear: z.string().optional(),
  maintenanceDueDay: z.number().int().min(1).max(28).optional(),
  currency: z.string().optional(),
  defaultMaintenance: z.number().min(0).optional(),
  penaltyConfig: z
    .object({
      type: z.enum(["FIXED", "PERCENTAGE"]),
      fixedPenalty: z.number().min(0),
      percentage: z.number().min(0),
      gracePeriodDays: z.number().int().min(0),
      maxPenalty: z.number().min(0),
      autoApply: z.boolean().optional(),
    })
    .optional(),
  privacy: z
    .object({
      showResidentPhone: z.boolean(),
      showResidentEmail: z.boolean(),
      showDirectoryToResidents: z.boolean(),
    })
    .optional(),
});
