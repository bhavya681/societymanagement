import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(8).max(15),
  password: z.string().min(8, "Password must be at least 8 characters"),
  societyCode: z.string().optional(),
  buildingName: z.string().optional(),
  flatNumber: z.string().min(1),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export const createResidentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(8).optional(),
  flatId: z.string().optional(),
  occupancyRole: z.enum(["OWNER", "TENANT", "FAMILY"]).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  role: z.enum(["RESIDENT", "MAINTENANCE_STAFF", "SECURITY", "COMMITTEE"]).optional(),
});

export const updateResidentSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  flatId: z.string().nullable().optional(),
  occupancyRole: z.enum(["OWNER", "TENANT", "FAMILY"]).nullable().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  avatar: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

export const statusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8),
});
