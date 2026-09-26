import { addLog } from "../utils/logger.js";

/**
 * Request Logging & Monitoring Middleware
 * Tracks incoming HTTP requests, duration, status codes, user identity, and emits structured audit logs
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Sorok-Core-Version", "v1.0.0");

  const method = req.method;
  const path = req.originalUrl || req.url;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "unknown";

  // Capture response finish
  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    let logLevel = "INFO";
    if (statusCode >= 500) {
      logLevel = "ERROR";
    } else if (statusCode >= 400) {
      logLevel = "WARN";
    }

    const authUser = req.user ? req.user.username : (path.includes("/auth/login") ? "auth_attempt" : "anonymous");
    const tenant = req.user ? req.user.tenantId : (req.headers["x-tenant-id"] || "default");

    addLog(logLevel, `${method} ${path} -> ${statusCode} (${durationMs}ms)`, {
      requestId,
      method,
      path,
      statusCode,
      durationMs,
      ip,
      user: authUser,
      tenant,
      userAgent: userAgent.substring(0, 80)
    });
  });

  next();
}
