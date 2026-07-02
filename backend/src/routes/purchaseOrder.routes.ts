import { Router } from "express";
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  getAllCommitments,
  createCommitment,
  updateCommitment,
} from "../controllers/purchaseOrder.controller";
import { protect, adminOnly } from "../middleware/auth";

const router = Router();
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
