import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/auth";
import { isDatabaseConnected } from "./config/database";
import authRoutes from "./routes/auth.routes";
import societyRoutes from "./routes/society.routes";
import residentRoutes from "./routes/resident.routes";
import { buildingRouter, flatRouter } from "./routes/property.routes";
import { billRouter, paymentRouter } from "./routes/bill.routes";
import expenseRoutes from "./routes/expense.routes";
import requestRoutes from "./routes/request.routes";
import announcementRoutes from "./routes/announcement.routes";
import {
  auditRouter,
  dashboardRouter,
  documentRouter,
  exportRouter,
  reportRouter,
} from "./routes/report.routes";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(morgan(env.isProd ? "combined" : "dev"));

  app.get("/api/health", (_req, res) => {
    const database = isDatabaseConnected() ? "connected" : "disconnected";
    res.json({
      success: database === "connected",
      server: "ok",
      database,
    });
  });

  app.use("/api/auth", authRoutes);

  const protectedApi = express.Router();
  protectedApi.use(authenticate);
  protectedApi.use("/society", societyRoutes);
  protectedApi.use("/residents", residentRoutes);
  protectedApi.use("/buildings", buildingRouter);
  protectedApi.use("/flats", flatRouter);
  protectedApi.use("/bills", billRouter);
  protectedApi.use("/payments", paymentRouter);
  protectedApi.use("/expenses", expenseRoutes);
  protectedApi.use("/requests", requestRoutes);
  protectedApi.use("/announcements", announcementRoutes);
  protectedApi.use("/reports", reportRouter);
  protectedApi.use("/dashboard", dashboardRouter);
  protectedApi.use("/documents", documentRouter);
  protectedApi.use("/audit", auditRouter);
  protectedApi.use("/exports", exportRouter);
  app.use("/api", protectedApi);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
