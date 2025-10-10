import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleRecommend } from "./routes/recommend";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/recommend", handleRecommend);
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });
  // Helpful message for accidental GET requests in browser
  app.get("/api/recommend", (_req, res) => {
    res.status(405).json({
      message: "Use POST with JSON body to get recommendations.",
      example: {
        preferences: {
          district: "Pune",
          targetPrice: 6.5,
          minAreaSqft: 60000,
          preferredType: "Industrial logistics parks",
          preferVerified: true,
          preferAvailability: true,
        },
        limit: 5,
      },
    });
  });

  return app;
}
