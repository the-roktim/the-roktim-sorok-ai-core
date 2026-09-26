import express from "express";
import {
  getAllRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  getRecordStats
} from "../controllers/dataController.js";
import { authenticateJWT, enforceTenantBoundary } from "../middleware/authMiddleware.js";
import { validateDataRecord, validateDataRecordUpdate } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Apply JWT authentication and Tenant Boundary guard to all data management routes
router.use(authenticateJWT);
router.use(enforceTenantBoundary);

/**
 * @openapi
 * /api/v1/data:
 *   get:
 *     summary: Retrieve enterprise data records with filtering & search
 *     tags:
 *       - Data & Knowledge Management (DOC-14/43)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [knowledge, policy, customer, lead, workflow, property, general]
 *         description: Filter by business record category
 *       - in: query
 *         name: classification
 *         schema:
 *           type: string
 *           enum: [PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED]
 *         description: Filter by data classification level
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         description: Filter by tenant (PCPOS, AgriOS, TextileOS)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text keyword search across title, content, and tags
 *     responses:
 *       200:
 *         description: List of records matching query
 *       401:
 *         description: Unauthorized
 */
router.get("/", getAllRecords);

/**
 * @openapi
 * /api/v1/data/stats:
 *   get:
 *     summary: Retrieve statistical summary breakdown of records
 *     tags:
 *       - Data & Knowledge Management (DOC-14/43)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Record distribution by category and classification
 */
router.get("/stats", getRecordStats);

/**
 * @openapi
 * /api/v1/data/{id}:
 *   get:
 *     summary: Retrieve a single data record by ID
 *     tags:
 *       - Data & Knowledge Management (DOC-14/43)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique ID of the record
 *     responses:
 *       200:
 *         description: Record details
 *       404:
 *         description: Record not found
 *       403:
 *         description: Cross-tenant access forbidden
 */
router.get("/:id", getRecordById);

/**
 * @openapi
 * /api/v1/data:
 *   post:
 *     summary: Create a new governed enterprise data or knowledge record
 *     tags:
 *       - Data & Knowledge Management (DOC-14/43)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDataRecordRequest'
 *     responses:
 *       201:
 *         description: Data record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DataRecord'
 *       400:
 *         description: Input validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/", validateDataRecord, createRecord);

/**
 * @openapi
 * /api/v1/data/{id}:
 *   put:
 *     summary: Update an existing data record (increments version)
 *     tags:
 *       - Data & Knowledge Management (DOC-14/43)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               category: { type: string }
 *               content: { type: string }
 *               classification: { type: string }
 *     responses:
 *       200:
 *         description: Data record updated
 *       404:
 *         description: Record not found
 */
router.put("/:id", validateDataRecordUpdate, updateRecord);

/**
 * @openapi
 * /api/v1/data/{id}:
 *   delete:
 *     summary: Delete a data record (Admin or Creator only)
 *     tags:
 *       - Data & Knowledge Management (DOC-14/43)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Data record deleted
 *       403:
 *         description: Forbidden - lacks delete authority
 *       404:
 *         description: Record not found
 */
router.delete("/:id", deleteRecord);

export default router;
