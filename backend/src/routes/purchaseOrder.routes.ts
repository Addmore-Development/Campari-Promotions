import { Router } from "express";
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  getAllCommitments,
  createCommitment,
  updateCommitment,
  getMyBudget,
} from "../controllers/purchaseOrder.controller";
import { protect, adminOnly, adminOrBusiness } from "../middleware/auth";

const router = Router();

// Client (BUSINESS) + Admin: "how much budget do I have left" — must be
// declared before the blanket adminOnly lock below.
router.get("/my-budget", protect, adminOrBusiness, getMyBudget);

router.use(protect, adminOnly);

// Commitment entries — declared before "/:id" so "/commitments" isn't swallowed
router.get("/commitments",           getAllCommitments);
router.post("/commitments",          createCommitment);
router.put("/commitments/:id",       updateCommitment);

// Purchase orders
router.get("/",       getAllPurchaseOrders);
router.post("/",      createPurchaseOrder);
router.get("/:id",    getPurchaseOrderById);
router.put("/:id",    updatePurchaseOrder);

export default router;
