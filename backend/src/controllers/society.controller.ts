import { Request, Response } from "express";
import { Society } from "../models/Society";
import { Building } from "../models/Building";
import { Flat } from "../models/Flat";
import { asyncHandler } from "../utils/asyncHandler";
import { success } from "../utils/response";
import { societyId } from "../utils/access";
import { AppError } from "../utils/AppError";
import { publicDoc } from "../utils/serialize";
import { rupeesToPaise, paiseToRupees } from "../utils/money";
import { writeAudit } from "../services/audit.service";

export const getSociety = asyncHandler(async (req: Request, res: Response) => {
  const society = await Society.findById(societyId(req));
  if (!society) throw AppError.notFound("Society not found", "SOCIETY_NOT_FOUND");
  const buildings = await Building.countDocuments({ societyId: society._id });
  const units = await Flat.countDocuments({ societyId: society._id, status: "ACTIVE" });
  society.totalBuildings = buildings;
  society.totalUnits = units;
  await society.save();
  const data = publicDoc(society) as Record<string, unknown>;
  data.defaultMaintenance = paiseToRupees(society.defaultMaintenancePaise);
  const penalty = society.penaltyConfig as unknown as Record<string, number>;
  data.penaltyConfig = {
    ...society.penaltyConfig,
    fixedPenalty: paiseToRupees(penalty.fixedPenalty),
    maxPenalty: paiseToRupees(penalty.maxPenalty),
  };
  return success(res, data);
});

export const updateSociety = asyncHandler(async (req: Request, res: Response) => {
  const society = await Society.findById(societyId(req));
  if (!society) throw AppError.notFound("Society not found", "SOCIETY_NOT_FOUND");
  const body = req.body;
  const scalar = [
    "name",
    "registrationNumber",
    "address",
    "city",
    "state",
    "pincode",
    "contactEmail",
    "contactPhone",
    "logo",
    "financialYear",
    "maintenanceDueDay",
    "currency",
  ] as const;
  for (const key of scalar) {
    if (body[key] !== undefined) (society as unknown as Record<string, unknown>)[key] = body[key];
  }
  if (body.defaultMaintenance !== undefined) {
    society.defaultMaintenancePaise = rupeesToPaise(body.defaultMaintenance);
  }
  if (body.penaltyConfig) {
    society.penaltyConfig = {
      type: body.penaltyConfig.type,
      fixedPenalty: rupeesToPaise(body.penaltyConfig.fixedPenalty),
      percentage: body.penaltyConfig.percentage,
      gracePeriodDays: body.penaltyConfig.gracePeriodDays,
      maxPenalty: rupeesToPaise(body.penaltyConfig.maxPenalty),
      autoApply: body.penaltyConfig.autoApply ?? true,
    };
  }
  if (body.privacy) society.privacy = body.privacy;
  await society.save();
  await writeAudit({
    userId: req.user!.id,
    societyId: societyId(req),
    action: "society.updated",
    entity: "Society",
    entityId: String(society._id),
  });
  return success(res, publicDoc(society), "Society settings updated");
});
