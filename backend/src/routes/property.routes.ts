import { Router } from "express";
import { createBuilding, deleteBuilding, listBuildings, updateBuilding } from "../controllers/building.controller";
import { createFlat, getFlat, listFlats, updateFlat } from "../controllers/flat.controller";
import { requireAdmin } from "../middleware/role";
import { validate } from "../middleware/validate";
import { createBuildingSchema, createFlatSchema, updateFlatSchema } from "../validators/payment.validators";

export const buildingRouter = Router();
buildingRouter.get("/", listBuildings);
buildingRouter.post("/", requireAdmin, validate(createBuildingSchema), createBuilding);
buildingRouter.put("/:id", requireAdmin, updateBuilding);
buildingRouter.delete("/:id", requireAdmin, deleteBuilding);

export const flatRouter = Router();
flatRouter.get("/", listFlats);
flatRouter.post("/", requireAdmin, validate(createFlatSchema), createFlat);
flatRouter.get("/:id", getFlat);
flatRouter.put("/:id", requireAdmin, validate(updateFlatSchema), updateFlat);
