import { Router } from "express";
import { getSociety, updateSociety } from "../controllers/society.controller";
import { requireAdmin } from "../middleware/role";
import { validate } from "../middleware/validate";
import { updateSocietySchema } from "../validators/payment.validators";

const router = Router();
router.get("/", getSociety);
router.put("/", requireAdmin, validate(updateSocietySchema), updateSociety);
export default router;
