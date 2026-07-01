import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config();

import { prisma, PORT, FRONTEND_URL } from "./config";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import jobRoutes from "./routes/job.routes";
import applicationRoutes from "./routes/application.routes";
import shiftRoutes from "./routes/shift.routes";
import paymentRoutes from "./routes/payment.routes";
import adminRoutes from "./routes/admin.routes";
import chatRoutes from "./routes/chat.routes";

const app = express();
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (dev only — use S3/CDN in production)
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(PORT, async () => {
  console.log(`Honey Group Backend running on http://localhost:${PORT}`);
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected");
  } catch (err) {
    console.error("Prisma connection failed:", err);
  }
});