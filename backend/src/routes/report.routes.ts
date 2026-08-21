import { Router } from "express";
import {
  aging,
  cashFlow,
  expensesReport,
  financialReport,
  maintenanceReport,
  requestsReport,
  residentsReport,
} from "../controllers/report.controller";
import { adminDashboard, residentDashboard } from "../controllers/dashboard.controller";
import {
  closeMonth,
  getMonthClosing,
  listMonthClosings,
  reopenMonth,
} from "../controllers/month-closing.controller";
import {
  createDocument,
  deleteDocument,
  exportCsv,
  listAudit,
  listDocuments,
} from "../controllers/misc.controller";
import { requireAdmin } from "../middleware/role";
import { validate } from "../middleware/validate";
import { createDocumentSchema } from "../validators/request.validators";

export const reportRouter = Router();
reportRouter.get("/financial", requireAdmin, financialReport);
reportRouter.get("/maintenance", requireAdmin, maintenanceReport);
reportRouter.get("/expenses", requireAdmin, expensesReport);
reportRouter.get("/requests", requireAdmin, requestsReport);
reportRouter.get("/residents", requireAdmin, residentsReport);
reportRouter.get("/cash-flow", requireAdmin, cashFlow);
reportRouter.get("/aging", requireAdmin, aging);

export const dashboardRouter = Router();
dashboardRouter.get("/admin", requireAdmin, adminDashboard);
dashboardRouter.get("/resident", residentDashboard);

export const documentRouter = Router();
documentRouter.get("/", listDocuments);
documentRouter.post("/", requireAdmin, validate(createDocumentSchema), createDocument);
documentRouter.delete("/:id", requireAdmin, deleteDocument);

export const auditRouter = Router();
auditRouter.get("/", requireAdmin, listAudit);

export const exportRouter = Router();
exportRouter.get("/:type", requireAdmin, exportCsv);

export const monthClosingRouter = Router();
monthClosingRouter.get("/", requireAdmin, listMonthClosings);
monthClosingRouter.get("/status", requireAdmin, getMonthClosing);
monthClosingRouter.post("/close", requireAdmin, closeMonth);
monthClosingRouter.post("/reopen", requireAdmin, reopenMonth);
