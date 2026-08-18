import { Router } from "express";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  markAnnouncementRead,
  updateAnnouncement,
} from "../controllers/announcement.controller";
import { requireAdmin } from "../middleware/role";
import { validate } from "../middleware/validate";
import { createAnnouncementSchema, updateAnnouncementSchema } from "../validators/request.validators";

const router = Router();
router.get("/", listAnnouncements);
router.post("/", requireAdmin, validate(createAnnouncementSchema), createAnnouncement);
router.put("/:id", requireAdmin, validate(updateAnnouncementSchema), updateAnnouncement);
router.delete("/:id", requireAdmin, deleteAnnouncement);
router.post("/:id/read", markAnnouncementRead);
export default router;
