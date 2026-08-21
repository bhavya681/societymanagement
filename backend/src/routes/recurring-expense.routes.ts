import { Router } from "express";
import {
  createRecurringExpense,
  deleteRecurringExpense,
  listRecurringExpenses,
  updateRecurringExpense,
} from "../controllers/recurring-expense.controller";
import { requireAdmin } from "../middleware/role";

const router = Router();
router.get("/", requireAdmin, listRecurringExpenses);
router.post("/", requireAdmin, createRecurringExpense);
router.put("/:id", requireAdmin, updateRecurringExpense);
router.delete("/:id", requireAdmin, deleteRecurringExpense);
export default router;
