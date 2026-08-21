import { Router } from "express";
import {
  closeMonth,
  getMonthClosing,
  listMonthClosings,
  reopenMonth,
} from "../controllers/month-closing.controller";
import { requireTreasurerOrAbove } from "../middleware/role";

const router = Router();
router.get("/", requireTreasurerOrAbove, listMonthClosings);
router.get("/status", requireTreasurerOrAbove, getMonthClosing);
router.post("/close", requireTreasurerOrAbove, closeMonth);
router.post("/reopen", requireTreasurerOrAbove, reopenMonth);
export default router;
