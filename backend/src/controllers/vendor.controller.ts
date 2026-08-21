import { Request, Response } from "express";
import { Vendor } from "../models/Vendor";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { societyId } from "../utils/access";
import { parsePagination, paginatedResult } from "../utils/pagination";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { escapeRegex } from "../utils/access";
import { writeAudit } from "../services/audit.service";

export const listVendors = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const { page, limit, skip, sort } = parsePagination(req.query, "createdAt");
  const filter: Record<string, unknown> = { societyId: sid };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search)), "i");
    filter.$or = [{ name: rx }, { contactPerson: rx }, { vendor: rx }];
  }
  const [rows, total] = await Promise.all([
    Vendor.find(filter).sort(sort).skip(skip).limit(limit),
    Vendor.countDocuments(filter),
  ]);
  return success(res, paginatedResult(rows.map(publicDoc), total, page, limit));
});

export const createVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await Vendor.create({
    societyId: societyId(req),
    name: req.body.name,
    category: req.body.category,
    contactPerson: req.body.contactPerson ?? "",
    phone: req.body.phone ?? "",
    email: req.body.email ?? "",
    address: req.body.address ?? "",
    gstNumber: req.body.gstNumber ?? "",
    panNumber: req.body.panNumber ?? "",
    services: req.body.services ?? [],
    paymentTerms: req.body.paymentTerms ?? "",
    notes: req.body.notes ?? "",
    status: req.body.status ?? "ACTIVE",
    createdBy: req.user!.id,
  });
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "vendor.created",
    entity: "Vendor",
    entityId: String(vendor._id),
    metadata: { name: vendor.name, category: vendor.category },
  });
  return created(res, publicDoc(vendor), "Vendor created");
});

export const updateVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, societyId: societyId(req) });
  if (!vendor) throw AppError.notFound("Vendor not found", "VENDOR_NOT_FOUND");
  const body = req.body;
  if (body.name) vendor.name = body.name;
  if (body.category) vendor.category = body.category;
  if (body.contactPerson !== undefined) vendor.contactPerson = body.contactPerson;
  if (body.phone !== undefined) vendor.phone = body.phone;
  if (body.email !== undefined) vendor.email = body.email;
  if (body.address !== undefined) vendor.address = body.address;
  if (body.gstNumber !== undefined) vendor.gstNumber = body.gstNumber;
  if (body.panNumber !== undefined) vendor.panNumber = body.panNumber;
  if (body.services) vendor.services = body.services;
  if (body.paymentTerms !== undefined) vendor.paymentTerms = body.paymentTerms;
  if (body.notes !== undefined) vendor.notes = body.notes;
  if (body.status) vendor.status = body.status;
  await vendor.save();
  return success(res, publicDoc(vendor), "Vendor updated");
});

export const deleteVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, societyId: societyId(req) });
  if (!vendor) throw AppError.notFound("Vendor not found", "VENDOR_NOT_FOUND");
  return success(res, { id: req.params.id }, "Vendor deleted");
});
