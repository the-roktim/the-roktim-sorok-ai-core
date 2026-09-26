import express from "express";
import { register, login, getProfile, validateToken, listUsers } from "../controllers/authController.js";
import { authenticateJWT, requireRole } from "../middleware/authMiddleware.js";
import { validateRegister, validateLogin } from "../middleware/validationMiddleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user or agent identity
 *     tags:
 *       - Authentication & Identity (DOC-27)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Input validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Username or email already taken
 */
router.post("/register", validateRegister, register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate user & issue signed JWT bearer token
 *     tags:
 *       - Authentication & Identity (DOC-27)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account suspended or inactive
 */
router.post("/login", validateLogin, login);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user profile & active tenant context
 *     tags:
 *       - Authentication & Identity (DOC-27)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved
 *       401:
 *         description: Unauthorized - missing or expired token
 */
router.get("/me", authenticateJWT, getProfile);

/**
 * @openapi
 * /api/v1/auth/validate:
 *   get:
 *     summary: Verify JWT token validity and inspect active security claims
 *     tags:
 *       - Authentication & Identity (DOC-27)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token is active and valid
 *       401:
 *         description: Invalid token
 */
router.get("/validate", authenticateJWT, validateToken);

/**
 * @openapi
 * /api/v1/auth/users:
 *   get:
 *     summary: List all registered enterprise identities (Admin/Auditor only)
 *     tags:
 *       - Authentication & Identity (DOC-27)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Identity list retrieved
 *       403:
 *         description: Forbidden - requires admin or auditor role
 */
router.get("/users", authenticateJWT, requireRole(["admin", "auditor"]), listUsers);

export default router;
