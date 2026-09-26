import express from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { connectDB, getDBStatus } from "./config/db.js";
import { initGoogleGenAI, getGenAIStatus } from "./config/gemini.js";
import { swaggerSpec } from "./config/swagger.js";
import { requestLogger } from "./middleware/loggerMiddleware.js";
import { addLog } from "./utils/logger.js";

import authRoutes from "./routes/authRoutes.js";
import dataRoutes from "./routes/dataRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import logRoutes from "./routes/logRoutes.js";

// Load environment configuration
dotenv.config();

export const app = express();

// Body Parser Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request Logging & Monitoring Middleware
app.use(requestLogger);

// Swagger API Documentation (OpenAPI 3.0)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { background-color: #0f172a; border-bottom: 2px solid #3b82f6; }
    .swagger-ui .info .title { color: #1e293b; font-weight: 700; }
    .swagger-ui .btn.authorize { background-color: #2563eb; color: #fff; border-color: #2563eb; }
  `,
  customSiteTitle: "SOROK AI Core API Documentation",
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Swagger JSON Specification Endpoint
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/data", dataRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/logs", logRoutes);

// Health & System Info Endpoint
app.get("/api/v1/health", (req, res) => {
  const dbStatus = getDBStatus();
  const aiStatus = getGenAIStatus();

  return res.status(200).json({
    status: "HEALTHY",
    system: "SOROK AI Core Enterprise Engine",
    version: "v1.0.0",
    architectureBaseline: "DOC-01 — DOC-54",
    timestamp: new Date().toISOString(),
    subsystems: {
      database: dbStatus,
      googleGenAI: aiStatus,
      jwtAuth: { enabled: true, standard: "RFC 7519" },
      multiTenancy: { enabled: true, supportedTenants: ["PCPOS", "AgriOS", "TextileOS", "SOROK-CORE"] },
      logging: { enabled: true, mode: "active-stream" }
    }
  });
});

// API Root Information Endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "SOROK AI Core Enterprise API",
    version: "1.0.0",
    docsUrl: "/api-docs",
    healthUrl: "/api/v1/health",
    endpoints: {
      auth: "/api/v1/auth",
      data: "/api/v1/data",
      ai: "/api/v1/ai",
      logs: "/api/v1/logs"
    }
  });
});

/**
 * Server Startup Sequence:
 * 1. Output architecture header
 * 2. Connect Database (MongoDB with in-memory fallback)
 * 3. Initialize Google GenAI SDK integration
 * 4. Verify system routes and start HTTP listener
 */
export async function startServer(port = process.env.PORT || 3000) {
  console.log("\n=======================================================");
  console.log("  ███████╗ ██████╗ ██████╗  ██████╗ ██╗  ██╗");
  console.log("  ██╔════╝██╔═══██╗██╔══██╗██╔═══██╗██║ ██╔╝");
  console.log("  ███████╗██║   ██║██████╔╝██║   ██║█████╔╝ ");
  console.log("  ╚════██║██║   ██║██╔══██╗██║   ██║██╔═██╗ ");
  console.log("  ███████║╚██████╔╝██║  ██║╚██████╔╝██║  ██╗");
  console.log("  SOROK AI Core Enterprise Platform (AWOS)");
  console.log("=======================================================\n");

  addLog("STARTUP", "Initiating SOROK AI Core Server Startup Sequence...");

  // Step 1: Connect Database
  await connectDB();

  // Step 2: Initialize Google GenAI SDK
  await initGoogleGenAI();

  // Step 3: Start HTTP Server if called standalone
  const server = app.listen(port, "0.0.0.0", () => {
    addLog("STARTUP", `SOROK AI Core Server successfully listening on http://0.0.0.0:${port}`);
    addLog("STARTUP", `Swagger Documentation available at http://0.0.0.0:${port}/api-docs`);
    addLog("STARTUP", `Health Check available at http://0.0.0.0:${port}/api/v1/health`);
    console.log(`\n>>> Server running at http://localhost:${port}`);
    console.log(`>>> Swagger UI: http://localhost:${port}/api-docs\n`);
  });

  return server;
}

// Auto-run if executed directly via node sorok-ai-core/index.js
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3000;
  startServer(PORT);
}

export default app;
