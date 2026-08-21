import { Router } from "express";
import {
  createIncome,
  deleteIncome,
  listIncome,
  updateIncome,
} from "../controllers/income.controller";
import { requireTreasurerOrAbove } from "../middleware/role";

const router = Router();
router.get("/", requireTreasurerOrAbove, listIncome);
router.post("/", requireTreasurerOrAbove, createIncome);
router.put("/:id", requireTreasurerOrAbove, updateIncome);
router.delete("/:id", requireTreasurerOrAbove, deleteIncome);
export default router;
