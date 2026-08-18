import { Router } from "express";
import {
  assignRequest,
  commentOnRequest,
  createRequest,
  getRequest,
  listRequests,
  updateRequest,
} from "../controllers/request.controller";
import { requireAdmin } from "../middleware/role";
import { validate } from "../middleware/validate";
import { assignSchema, commentSchema, createRequestSchema, updateRequestSchema } from "../validators/request.validators";

const router = Router();
router.get("/", listRequests);
router.post("/", validate(createRequestSchema), createRequest);
router.get("/:id", getRequest);
router.put("/:id", requireAdmin, validate(updateRequestSchema), updateRequest);
router.post("/:id/comments", validate(commentSchema), commentOnRequest);
router.post("/:id/assign", requireAdmin, validate(assignSchema), assignRequest);
export default router;
