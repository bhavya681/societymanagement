import { Router } from "express";
import {
  createResident,
  getResident,
  listResidents,
  resetResidentPassword,
  residentHistory,
  updateResident,
  updateResidentStatus,
} from "../controllers/resident.controller";
import { requireAdmin } from "../middleware/role";
import { validate } from "../middleware/validate";
import {
  createResidentSchema,
  resetPasswordSchema,
  statusSchema,
  updateResidentSchema,
} from "../validators/auth.validators";

const router = Router();
router.get("/", listResidents);
router.post("/", requireAdmin, validate(createResidentSchema), createResident);
router.get("/:id", getResident);
router.put("/:id", validate(updateResidentSchema), updateResident);
router.patch("/:id/status", requireAdmin, validate(statusSchema), updateResidentStatus);
router.post("/:id/reset-password", requireAdmin, validate(resetPasswordSchema), resetResidentPassword);
router.get("/:id/history", residentHistory);
export default router;
