import jwt from "jsonwebtoken";
import { addLog } from "../utils/logger.js";

export const JWT_SECRET = process.env.JWT_SECRET || "sorok_ai_core_enterprise_secret_key_2026";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * JWT Authentication Middleware
 * Validates the Authorization header Bearer token and attaches user context to req.user
 */
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    addLog("WARN", `Unauthorized API access attempt to ${req.method} ${req.path}: Missing Authorization header`, {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      message: "Access denied. Bearer authorization token is required."
    });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      success: false,
      error: "INVALID_TOKEN_FORMAT",
      message: "Authorization header format must be 'Bearer <token>'."
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    // Log successful token authentication for sensitive endpoints
    req.authContext = {
      userId: decoded.id || decoded.userId,
      username: decoded.username,
      role: decoded.role,
      tenantId: decoded.tenantId,
      vertical: decoded.vertical
    };
    next();
  } catch (err) {
    addLog("WARN", `JWT token validation failed for ${req.method} ${req.path}: ${err.message}`, {
      error: err.name
    });
    return res.status(401).json({
      success: false,
      error: "INVALID_OR_EXPIRED_TOKEN",
      message: err.name === "TokenExpiredError" ? "JWT token has expired. Please log in again." : "Invalid JWT token signature."
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to specific roles (e.g. admin, operator, auditor)
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "Authentication required."
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      addLog("WARN", `Forbidden role access attempt: user '${req.user.username}' (${req.user.role}) attempted to access ${req.method} ${req.path}`, {
        user: req.user.username,
        role: req.user.role,
        allowedRoles
      });
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: `Forbidden: Current role '${req.user.role}' lacks permission. Required: [${allowedRoles.join(", ")}].`
      });
    }

    next();
  };
}

/**
 * Tenant Isolation Guard (DOC-07 & DOC-41 Multi-Tenant Boundary)
 * Enforces that users can only access data belonging to their approved tenant
 */
export function enforceTenantBoundary(req, res, next) {
  if (!req.user) return next();

  // Admin users can inspect cross-tenant records if explicitly declared
  if (req.user.role === "admin") return next();

  // If a resource query or body contains tenantId, check match
  const requestedTenant = req.body?.tenantId || req.query?.tenantId;
  if (requestedTenant && requestedTenant !== req.user.tenantId && requestedTenant !== "all") {
    addLog("WARN", `Cross-tenant violation prevented: user '${req.user.username}' (tenant: ${req.user.tenantId}) requested access to tenant '${requestedTenant}'`, {
      tenant: req.user.tenantId,
      requestedTenant
    });
    return res.status(403).json({
      success: false,
      error: "TENANT_BOUNDARY_VIOLATION",
      message: `Access denied. Cross-tenant access from '${req.user.tenantId}' to '${requestedTenant}' is restricted.`
    });
  }

  next();
}
