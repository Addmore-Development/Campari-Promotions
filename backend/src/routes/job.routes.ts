import { Router } from "express";
import { getAllJobs, getJobById, createJob, updateJob, deleteJob, getMyJobs, getBusinessJobs } from "../controllers/job.controller";
import { protect, adminOnly } from "../middleware/auth";

// Optional auth middleware — attaches req.user if token present, but does NOT reject if missing.
// This lets the public landing page fetch all open jobs without a token,
// while still filtering by role when a token is provided.
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import { AuthRequest } from "../middleware/auth";

const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET) as { id: string; email: string; role: string };
      req.user = decoded;
    } catch {
      // Invalid token — treat as unauthenticated (don't reject)
    }
  }
  next();
};

const router = Router();

// Public + auth-aware: unauthenticated → all open jobs; authenticated → role-filtered
router.get("/",        optionalAuth, getAllJobs);
router.get("/my",      protect, getMyJobs);
router.get("/business", protect, getBusinessJobs);
router.get("/:id",     optionalAuth, getJobById);
router.post("/",       protect, adminOnly, createJob);
router.put("/:id",     protect, adminOnly, updateJob);
router.delete("/:id",  protect, adminOnly, deleteJob);

export default router;