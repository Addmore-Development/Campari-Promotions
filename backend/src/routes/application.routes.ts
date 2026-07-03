import { Router } from "express";
import {
  applyToJob,
  getApplicationsForJob,
  updateApplicationStatus,
  getMyApplications,
  bulkAllocate,
} from "../controllers/application.controller";
import { protect, adminOnly, adminOrBusiness, adminBusinessOrSupervisor } from "../middleware/auth";

const router = Router();

router.post("/",           protect, applyToJob);
router.post("/bulk-allocate", protect, adminBusinessOrSupervisor, bulkAllocate);
router.get("/my",          protect, getMyApplications);
router.get("/job/:jobId",  protect, adminBusinessOrSupervisor, getApplicationsForJob);
router.put("/:id/status",  protect, adminBusinessOrSupervisor, updateApplicationStatus);

export default router;