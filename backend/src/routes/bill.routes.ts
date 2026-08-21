import { Router } from "express";
import { generateBills, getBill, listBills, outstandingBills, payBill, updateBill } from "../controllers/bill.controller";
import { createPayment, getPayment, listPayments } from "../controllers/payment.controller";
import { requireAdmin } from "../middleware/role";
import { validate } from "../middleware/validate";
import { billPaymentSchema, generateBillsSchema, updateBillSchema } from "../validators/bill.validators";
import { createPaymentSchema } from "../validators/payment.validators";

export const billRouter = Router();
billRouter.get("/", listBills);
billRouter.get("/outstanding", requireAdmin, outstandingBills);
billRouter.post("/generate", requireAdmin, validate(generateBillsSchema), generateBills);
billRouter.get("/:id", getBill);
billRouter.put("/:id", requireAdmin, validate(updateBillSchema), updateBill);
billRouter.post("/:id/payment", validate(billPaymentSchema), payBill);

export const paymentRouter = Router();
paymentRouter.get("/", listPayments);
paymentRouter.post("/", requireAdmin, validate(createPaymentSchema), createPayment);
paymentRouter.get("/:id", getPayment);
