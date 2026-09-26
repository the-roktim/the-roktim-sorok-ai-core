import express from "express";
import { getLogs, clearLogs, addLog } from "../utils/logger.js";
import { authenticateJWT, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/v1/logs:
 *   get:
 *     summary: Retrieve real-time incoming request monitoring & audit logs
 *     tags:
 *       - System & Audit Logs (DOC-29)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of recent logs to return
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [INFO, WARN, ERROR, AUDIT, STARTUP, ACCESS]
 *         description: Filter logs by level
 *     responses:
 *       200:
 *         description: List of monitoring log entries
 */
router.get("/", (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const level = req.query.level || null;
  const logs = getLogs(limit, level);

  return res.status(200).json({
    success: true,
    count: logs.length,
    data: logs
  });
});

/**
 * @openapi
 * /api/v1/logs:
 *   delete:
 *     summary: Clear in-memory log buffer (Admin only)
 *     tags:
 *       - System & Audit Logs (DOC-29)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logs cleared
 *       403:
 *         description: Forbidden
 */
router.delete("/", authenticateJWT, requireRole(["admin"]), (req, res) => {
  clearLogs();
  addLog("AUDIT", `Log buffer purged by administrator '${req.user.username}'`);
  return res.status(200).json({
    success: true,
    message: "In-memory audit log buffer cleared."
  });
});

export default router;
