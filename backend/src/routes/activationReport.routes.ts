import { Router } from "express";
import {
  getReportForJob,
  saveReportForJob,
  getAllReports,
  getClientReport,
  activationShotUpload,
} from "../controllers/activationReport.controller";
import { protect, adminOnly } from "../middleware/auth";

const router = Router();

// Admin: list / client summary — declared before the ":jobId" wildcard route
router.get("/",               protect, adminOnly, getAllReports);
router.get("/client-report",  protect, adminOnly, getClientReport);

// Promoter/supervisor + Admin: single job's report
router.get("/job/:jobId",  protect, getReportForJob);
router.post("/job/:jobId", protect, activationShotUpload, saveReportForJob);

export default router;
