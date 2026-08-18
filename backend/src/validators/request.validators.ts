import { z } from "zod";

export const createRequestSchema = z.object({
  title: z.string().min(3),
  category: z.enum([
    "plumbing",
    "electrical",
    "lift",
    "water",
    "security",
    "cleaning",
    "parking",
    "structural",
    "internet",
    "other",
  ]),
  description: z.string().min(5),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  location: z.string().optional(),
});

export const updateRequestSchema = z.object({
  status: z
    .enum(["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REJECTED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedTo: z.string().nullable().optional(),
});

export const commentSchema = z.object({
  message: z.string().min(1),
  isInternal: z.boolean().optional(),
});

export const assignSchema = z.object({
  assignedTo: z.string().min(1),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(3),
  category: z.enum([
    "general",
    "maintenance",
    "emergency",
    "event",
    "security",
    "water",
    "electricity",
    "meeting",
  ]),
  priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).optional(),
  publishDate: z.string().optional(),
  expiryDate: z.string().nullable().optional(),
  pinned: z.boolean().optional(),
  important: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const createDocumentSchema = z.object({
  title: z.string().min(2),
  category: z.enum([
    "meeting_notice",
    "agm",
    "rules",
    "invoice",
    "maintenance",
    "circular",
    "financial_report",
    "other",
  ]),
  description: z.string().optional(),
  url: z.string().url().or(z.literal("")).optional(),
  fileName: z.string().optional(),
  visibleToResidents: z.boolean().optional(),
  storageProvider: z.enum(["external_url", "local", "s3", "cloudinary"]).optional(),
});
