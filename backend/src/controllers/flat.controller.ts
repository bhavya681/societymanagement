import { Request, Response } from "express";
import { Flat } from "../models/Flat";
import { Building } from "../models/Building";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { escapeRegex, societyId } from "../utils/access";
import { parsePagination, paginatedResult } from "../utils/pagination";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { writeAudit } from "../services/audit.service";

export const listFlats = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const { page, limit, skip, sort } = parsePagination(req.query, "flatNumber");
  const filter: Record<string, unknown> = { societyId: sid };
  if (req.query.buildingId) filter.buildingId = req.query.buildingId;
  if (req.query.ownershipStatus) filter.ownershipStatus = req.query.ownershipStatus;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.search) filter.flatNumber = new RegExp(escapeRegex(String(req.query.search)), "i");
  const [rows, total] = await Promise.all([
    Flat.find(filter)
      .populate("buildingId", "name")
      .populate("owner", "name email phone")
      .populate("occupants", "name email phone occupancyRole")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Flat.countDocuments(filter),
  ]);
  return success(res, paginatedResult(rows.map(publicDoc), total, page, limit));
});

export const getFlat = asyncHandler(async (req: Request, res: Response) => {
  const flat = await Flat.findOne({ _id: req.params.id, societyId: societyId(req) })
    .populate("buildingId", "name")
    .populate("owner", "name email phone")
    .populate("occupants", "name email phone occupancyRole");
  if (!flat) throw AppError.notFound("Flat not found", "FLAT_NOT_FOUND");
  return success(res, publicDoc(flat));
});

export const createFlat = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const building = await Building.findOne({ _id: req.body.buildingId, societyId: sid });
  if (!building) throw AppError.notFound("Building not found", "BUILDING_NOT_FOUND");
  const flat = await Flat.create({
    societyId: sid,
    buildingId: building._id,
    flatNumber: req.body.flatNumber,
    floor: req.body.floor,
    type: req.body.type,
    area: req.body.area ?? 0,
    parkingSpaces: req.body.parkingSpaces ?? 0,
    ownershipStatus: req.body.ownershipStatus ?? "VACANT",
    owner: req.body.owner || null,
    occupants: req.body.owner ? [req.body.owner] : [],
  });
  building.units = await Flat.countDocuments({ buildingId: building._id });
  await building.save();
  if (req.body.owner) {
    await User.updateOne({ _id: req.body.owner, societyId: sid }, { $set: { flatId: flat._id } });
  }
  await writeAudit({
    userId: req.user!.id,
    societyId: sid,
    action: "flat.created",
    entity: "Flat",
    entityId: String(flat._id),
  });
  return created(res, publicDoc(flat), "Flat created");
});

export const updateFlat = asyncHandler(async (req: Request, res: Response) => {
  const sid = societyId(req);
  const flat = await Flat.findOne({ _id: req.params.id, societyId: sid });
  if (!flat) throw AppError.notFound("Flat not found", "FLAT_NOT_FOUND");
  const fields = ["flatNumber", "floor", "type", "area", "parkingSpaces", "ownershipStatus", "status"] as const;
  for (const field of fields) {
    if (req.body[field] !== undefined) (flat as unknown as Record<string, unknown>)[field] = req.body[field];
  }
  if (req.body.buildingId) flat.buildingId = req.body.buildingId;
  if (req.body.owner !== undefined) flat.owner = req.body.owner || null;
  if (req.body.occupants) flat.occupants = req.body.occupants;
  await flat.save();
  return success(res, publicDoc(flat), "Flat updated");
});
