import { Router } from "express";
import {
  getReportForJob,
  saveReportForJob,
  getAllReports,
  getClientReport,
  getCampaignInsights,
  getMyClientReport,
  activationShotUpload,
} from "../controllers/activationReport.controller";
import { protect, adminOnly, adminOrBusiness } from "../middleware/auth";

const router = Router();

// Admin: list / client summary — declared before the ":jobId" wildcard route
router.get("/",               protect, adminOnly, getAllReports);
router.get("/client-report",  protect, adminOnly, getClientReport);

// Admin + Business: campaign insights (successful vs failed vs pending) and
// the business's own self-serve activation report
router.get("/insights",          protect, adminOrBusiness, getCampaignInsights);
router.get("/my-client-report",  protect, adminOrBusiness, getMyClientReport);

// Promoter/supervisor + Business + Admin: single job's report
router.get("/job/:jobId",  protect, getReportForJob);
router.post("/job/:jobId", protect, activationShotUpload, saveReportForJob);

export default router;
