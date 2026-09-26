import express from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

// Import core modules from sorok-ai-core
import { connectDB, getDBStatus } from "./sorok-ai-core/config/db.js";
import { initGoogleGenAI, getGenAIStatus } from "./sorok-ai-core/config/gemini.js";
import { swaggerSpec } from "./sorok-ai-core/config/swagger.js";
import { requestLogger } from "./sorok-ai-core/middleware/loggerMiddleware.js";
import { addLog } from "./sorok-ai-core/utils/logger.js";

import authRoutes from "./sorok-ai-core/routes/authRoutes.js";
import dataRoutes from "./sorok-ai-core/routes/dataRoutes.js";
import aiRoutes from "./sorok-ai-core/routes/aiRoutes.js";
import logRoutes from "./sorok-ai-core/routes/logRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body Parsers
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Incoming Request Monitoring & Structured Audit Logger
app.use(requestLogger);

// Swagger API Documentation (OpenAPI 3.0)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { background-color: #090d16; border-bottom: 2px solid #2563eb; }
    .swagger-ui .info .title { color: #0f172a; font-weight: 800; font-family: system-ui; }
    .swagger-ui .btn.authorize { background-color: #2563eb; color: #fff; border-color: #2563eb; font-weight: 600; }
  `,
  customSiteTitle: "SOROK AI Core — Enterprise Swagger Documentation",
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Swagger JSON Spec Endpoint
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Mount Core API v1 Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/data", dataRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/logs", logRoutes);

// Health & System Info
app.get("/api/v1/health", (req, res) => {
  const dbStatus = getDBStatus();
  const aiStatus = getGenAIStatus();

  res.status(200).json({
    status: "HEALTHY",
    system: "SOROK AI Core Enterprise Engine (AWOS)",
    version: "v1.0.0",
    architectureBaseline: "DOC-01 through DOC-54",
    timestamp: new Date().toISOString(),
    subsystems: {
      database: dbStatus,
      googleGenAI: aiStatus,
      jwtAuth: { enabled: true, standard: "RFC 7519", algorithm: "HS256" },
      multiTenancy: { enabled: true, verticals: ["PCPOS", "AgriOS", "TextileOS", "SOROK-CORE"] },
      logging: { enabled: true, bufferSize: 500, stream: "active" },
      swagger: { docsUrl: "/api-docs", specUrl: "/api/docs.json" }
    }
  });
});

// API Root summary
app.get("/api", (req, res) => {
  res.json({
    name: "SOROK AI Core Enterprise API Gateway",
    version: "1.0.0",
    swaggerUi: "/api-docs",
    healthCheck: "/api/v1/health",
    documentationJson: "/api/docs.json",
    endpoints: {
      auth: "/api/v1/auth",
      data: "/api/v1/data",
      ai: "/api/v1/ai",
      logs: "/api/v1/logs"
    }
  });
});

// Setup Frontend Vite Middleware in dev or static files in production
async function setupFrontend() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    }
  }
}

// Startup Sequence
async function start() {
  console.log("=======================================================");
  console.log("  SOROK AI Core — Enterprise Architecture Server");
  console.log("  AI Workforce Operating System (AWOS v1.0)");
  console.log("=======================================================");

  addLog("STARTUP", "Initiating Server Startup Sequence...");

  // 1. Connect to Database (Mongoose with seamless memory fallback)
  await connectDB();

  // 2. Initialize Google GenAI Integration
  await initGoogleGenAI();

  // 3. Attach Frontend Dev / Production Middleware
  await setupFrontend();

  // 4. Start HTTP Listener on Port 3000
  app.listen(PORT, "0.0.0.0", () => {
    addLog("STARTUP", `SOROK AI Core server listening on port ${PORT}`);
    addLog("STARTUP", `Swagger OpenAPI 3.0 Documentation ready at /api-docs`);
    addLog("STARTUP", `Interactive Web Console & Control Center ready at http://0.0.0.0:${PORT}`);
    console.log(`\n>>> Server running at: http://localhost:${PORT}`);
    console.log(`>>> Swagger UI:        http://localhost:${PORT}/api-docs`);
    console.log(`>>> Health Check:      http://localhost:${PORT}/api/v1/health\n`);
  });
}

start().catch(err => {
  console.error("FATAL server startup error:", err);
  process.exit(1);
});
