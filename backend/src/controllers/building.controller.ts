import { Request, Response } from "express";
import { Building } from "../models/Building";
import { Flat } from "../models/Flat";
import { asyncHandler } from "../utils/asyncHandler";
import { created, success } from "../utils/response";
import { societyId } from "../utils/access";
import { publicDoc } from "../utils/serialize";
import { AppError } from "../utils/AppError";
import { writeAudit } from "../services/audit.service";

export const listBuildings = asyncHandler(async (req: Request, res: Response) => {
  const buildings = await Building.find({ societyId: societyId(req) }).sort({ name: 1 });
  const withCounts = await Promise.all(
    buildings.map(async (b) => {
      const units = await Flat.countDocuments({ buildingId: b._id, status: "ACTIVE" });
      return { ...publicDoc(b), units };
    }),
  );
  return success(res, withCounts);
});

export const createBuilding = asyncHandler(async (req: Request, res: Response) => {
  const building = await Building.create({
    societyId: societyId(req),
    name: req.body.name,
    numberOfFloors: req.body.numberOfFloors,
    units: 0,
  });
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "building.created",
    entity: "Building",
    entityId: String(building._id),
  });
  return created(res, publicDoc(building), "Building created");
});

export const updateBuilding = asyncHandler(async (req: Request, res: Response) => {
  const building = await Building.findOneAndUpdate(
    { _id: req.params.id, societyId: societyId(req) },
    { $set: { name: req.body.name, numberOfFloors: req.body.numberOfFloors } },
    { new: true },
  );
  if (!building) throw AppError.notFound("Building not found", "BUILDING_NOT_FOUND");
  return success(res, publicDoc(building), "Building updated");
});

export const deleteBuilding = asyncHandler(async (req: Request, res: Response) => {
  const count = await Flat.countDocuments({ buildingId: req.params.id, societyId: societyId(req) });
  if (count > 0) {
    throw AppError.badRequest("Remove or reassign flats before deleting this building", "BUILDING_HAS_FLATS");
  }
  const building = await Building.findOneAndDelete({ _id: req.params.id, societyId: societyId(req) });
  if (!building) throw AppError.notFound("Building not found", "BUILDING_NOT_FOUND");
  return success(res, { id: req.params.id }, "Building deleted");
});
