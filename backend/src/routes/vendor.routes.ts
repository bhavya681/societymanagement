import { Router } from "express";
import {
  createVendor,
  deleteVendor,
  listVendors,
  updateVendor,
} from "../controllers/vendor.controller";
import { requireAdmin } from "../middleware/role";

const router = Router();
router.get("/", requireAdmin, listVendors);
router.post("/", requireAdmin, createVendor);
router.put("/:id", requireAdmin, updateVendor);
router.delete("/:id", requireAdmin, deleteVendor);
export default router;
