import { Router } from "express";
import {
  getMyShifts,
  getAllShifts,
  checkIn,
  checkOut,
  reportIssue,
  getLiveLocations,
  approveShift,
  updateLiveLocation,
  selfieUpload,
} from "../controllers/shift.controller";
import { protect, adminOnly } from "../middleware/auth";

const router = Router();

router.get("/my",             protect, getMyShifts);
router.get("/live-locations", protect, getLiveLocations);
router.get("/all",            protect, adminOnly, getAllShifts);
router.post("/:id/checkin",   protect, selfieUpload, checkIn);
router.post("/:id/checkout",  protect, selfieUpload, checkOut);
router.post("/:id/issue",     protect, reportIssue);
router.put("/:id/approve",    protect, adminOnly, approveShift);
// Live location ping — called every 30s by the promoter's device during a shift
router.post("/location/update", protect, updateLiveLocation);

export default router;