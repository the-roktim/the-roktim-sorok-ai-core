import { UserStore, comparePassword } from "../models/User.js";
import { generateToken } from "../middleware/authMiddleware.js";
import { addLog } from "../utils/logger.js";

/**
 * Handle user registration
 */
export async function register(req, res) {
  try {
    const { username, email, password, fullName, role, tenantId, vertical } = req.body;

    // Check if user already exists
    const existingUsername = await UserStore.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: "USERNAME_TAKEN",
        message: `Username '${username}' is already in use.`
      });
    }

    const existingEmail = await UserStore.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: "EMAIL_TAKEN",
        message: `Email '${email}' is already registered.`
      });
    }

    // Create the user
    const newUser = await UserStore.create({
      username,
      email,
      password,
      fullName: fullName || "SOROK AI Operator",
      role: role || "operator",
      tenantId: tenantId || "PCPOS",
      vertical: vertical || (tenantId === "AgriOS" ? "AgriOS" : tenantId === "TextileOS" ? "TextileOS" : "PCPOS"),
      status: "active"
    });

    // Generate JWT token
    const tokenPayload = {
      id: newUser.id || newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      tenantId: newUser.tenantId,
      vertical: newUser.vertical
    };

    const token = generateToken(tokenPayload);

    addLog("AUDIT", `New user registered: ${newUser.username} (${newUser.role}) under tenant ${newUser.tenantId}`, {
      userId: newUser.id || newUser._id,
      tenant: newUser.tenantId
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: {
        user: tokenPayload,
        token,
        tokenType: "Bearer",
        expiresIn: "24h"
      }
    });
  } catch (err) {
    addLog("ERROR", `Registration error: ${err.message}`, { stack: err.stack });
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to process user registration.",
      details: err.message
    });
  }
}

/**
 * Handle user authentication & JWT issuance
 */
export async function login(req, res) {
  try {
    const { username, email, password } = req.body;

    const user = await UserStore.findOne({ username, email });
    if (!user) {
      addLog("WARN", `Authentication failed: Account not found for '${username || email}'`);
      return res.status(401).json({
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Invalid username/email or password."
      });
    }

    // Check account status
    if (user.status !== "active") {
      addLog("WARN", `Authentication blocked: Account '${user.username}' is ${user.status}`);
      return res.status(403).json({
        success: false,
        error: "ACCOUNT_INACTIVE",
        message: `Account is currently ${user.status}. Contact administrator.`
      });
    }

    // Compare password
    const isMatch = comparePassword(password, user.password);
    if (!isMatch) {
      addLog("WARN", `Authentication failed: Password mismatch for user '${user.username}'`);
      return res.status(401).json({
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Invalid username/email or password."
      });
    }

    // Generate JWT token
    const tokenPayload = {
      id: user.id || user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      vertical: user.vertical
    };

    const token = generateToken(tokenPayload);

    addLog("AUDIT", `User authenticated successfully: ${user.username} [Role: ${user.role}, Tenant: ${user.tenantId}]`);

    return res.status(200).json({
      success: true,
      message: "Authentication successful.",
      data: {
        user: tokenPayload,
        token,
        tokenType: "Bearer",
        expiresIn: "24h"
      }
    });
  } catch (err) {
    addLog("ERROR", `Login error: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to process user login.",
      details: err.message
    });
  }
}

/**
 * Get current authenticated user profile
 */
export async function getProfile(req, res) {
  try {
    const user = await UserStore.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "USER_NOT_FOUND",
        message: "User profile not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id || user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        vertical: user.vertical,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: err.message
    });
  }
}

/**
 * Token introspection / validation endpoint
 */
export async function validateToken(req, res) {
  return res.status(200).json({
    success: true,
    valid: true,
    message: "JWT token is valid and authenticated.",
    claims: req.user
  });
}

/**
 * List all registered identities (Admin/Auditor only)
 */
export async function listUsers(req, res) {
  try {
    const users = await UserStore.getAll();
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: err.message
    });
  }
}
