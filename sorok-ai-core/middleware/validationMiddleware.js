import { addLog } from "../utils/logger.js";

/**
 * Standard Email Format Validator
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
}

/**
 * Validates User Registration Payload
 */
export function validateRegister(req, res, next) {
  const { username, email, password, role, tenantId } = req.body || {};
  const errors = [];

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    errors.push("Username is required and must be at least 3 characters long.");
  } else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
    errors.push("Username can only contain alphanumeric characters, underscores, and hyphens.");
  }

  if (!email || !isValidEmail(email)) {
    errors.push("A valid email address is required.");
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    errors.push("Password is required and must be at least 6 characters long.");
  }

  const validRoles = ["admin", "executive", "operator", "auditor", "agent"];
  if (role && !validRoles.includes(role)) {
    errors.push(`Invalid role '${role}'. Allowed roles: ${validRoles.join(", ")}`);
  }

  const validTenants = ["PCPOS", "AgriOS", "TextileOS", "SOROK-CORE", "SOROK-CORPORATE", "default"];
  if (tenantId && !validTenants.includes(tenantId)) {
    errors.push(`Invalid tenantId '${tenantId}'.`);
  }

  if (errors.length > 0) {
    addLog("WARN", `Input validation failed on POST /api/v1/auth/register`, { errors });
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "User registration input validation failed.",
      errors
    });
  }

  // Sanitize
  req.body.username = username.trim().toLowerCase();
  req.body.email = email.trim().toLowerCase();
  req.body.role = role || "operator";
  req.body.tenantId = tenantId || "PCPOS";

  next();
}

/**
 * Validates User Login Payload
 */
export function validateLogin(req, res, next) {
  const { username, email, password } = req.body || {};
  const errors = [];

  if (!username && !email) {
    errors.push("Either username or email is required for login.");
  }

  if (!password || typeof password !== "string") {
    errors.push("Password is required.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "Login input validation failed.",
      errors
    });
  }

  next();
}

/**
 * Validates Data Record Creation Payload
 */
export function validateDataRecord(req, res, next) {
  const { title, category, content, classification, tenantId } = req.body || {};
  const errors = [];

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    errors.push("Record title is required and cannot be empty.");
  }

  const validCategories = ["knowledge", "policy", "customer", "lead", "workflow", "property", "general"];
  if (!category || !validCategories.includes(category)) {
    errors.push(`Category is required and must be one of: ${validCategories.join(", ")}`);
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    errors.push("Record content is required.");
  }

  const validClassifications = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"];
  if (classification && !validClassifications.includes(classification)) {
    errors.push(`Classification must be one of: ${validClassifications.join(", ")}`);
  }

  if (errors.length > 0) {
    addLog("WARN", `Input validation failed on Data Record creation`, { errors });
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "Data record input validation failed.",
      errors
    });
  }

  // Clean strings
  req.body.title = title.trim();
  req.body.content = content.trim();
  req.body.classification = classification || "INTERNAL";
  req.body.tenantId = tenantId || req.user?.tenantId || "PCPOS";

  next();
}

/**
 * Validates Data Record Update Payload
 */
export function validateDataRecordUpdate(req, res, next) {
  const { title, category, content, classification } = req.body || {};
  const errors = [];

  if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
    errors.push("Record title cannot be empty.");
  }

  const validCategories = ["knowledge", "policy", "customer", "lead", "workflow", "property", "general"];
  if (category !== undefined && !validCategories.includes(category)) {
    errors.push(`Category must be one of: ${validCategories.join(", ")}`);
  }

  if (content !== undefined && (typeof content !== "string" || content.trim().length === 0)) {
    errors.push("Record content cannot be empty.");
  }

  const validClassifications = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"];
  if (classification !== undefined && !validClassifications.includes(classification)) {
    errors.push(`Classification must be one of: ${validClassifications.join(", ")}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "Data record update validation failed.",
      errors
    });
  }

  next();
}
