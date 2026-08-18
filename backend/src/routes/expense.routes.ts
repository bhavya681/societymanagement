import { Router } from "express";
import { createExpense, deleteExpense, listExpenses, updateExpense } from "../controllers/expense.controller";
import { requireAdmin } from "../middleware/role";
import { validate } from "../middleware/validate";
import { createExpenseSchema, updateExpenseSchema } from "../validators/payment.validators";

const router = Router();
router.get("/", requireAdmin, listExpenses);
router.post("/", requireAdmin, validate(createExpenseSchema), createExpense);
router.put("/:id", requireAdmin, validate(updateExpenseSchema), updateExpense);
router.delete("/:id", requireAdmin, deleteExpense);
export default router;
