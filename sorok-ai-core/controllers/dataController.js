import { DataRecordStore } from "../models/DataRecord.js";
import { addLog } from "../utils/logger.js";

/**
 * Get all data records with optional category, tenant, classification, and search filtering
 */
export async function getAllRecords(req, res) {
  try {
    const { category, classification, tenantId, status, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (category) query.category = category;
    if (classification) query.classification = classification;
    if (status) query.status = status;
    if (search) query.search = search;

    // Enforce Tenant Boundary: Non-admins can only see records for their tenant
    if (req.user && req.user.role !== "admin") {
      query.tenantId = req.user.tenantId;
    } else if (tenantId && tenantId !== "all") {
      query.tenantId = tenantId;
    }

    const records = await DataRecordStore.find(query);

    return res.status(200).json({
      success: true,
      count: records.length,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      tenantContext: req.user?.tenantId || "all",
      data: records
    });
  } catch (err) {
    addLog("ERROR", `Failed to retrieve data records: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to fetch data records.",
      details: err.message
    });
  }
}

/**
 * Get a single data record by ID
 */
export async function getRecordById(req, res) {
  try {
    const { id } = req.params;
    const record = await DataRecordStore.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Data record with ID '${id}' not found.`
      });
    }

    // Tenant Isolation Check
    if (req.user && req.user.role !== "admin" && record.tenantId !== req.user.tenantId) {
      addLog("WARN", `Cross-tenant read blocked: user '${req.user.username}' attempted to read record '${id}' belonging to '${record.tenantId}'`);
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "Access denied. Record belongs to another isolated tenant."
      });
    }

    return res.status(200).json({
      success: true,
      data: record
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
 * Create a new data record
 */
export async function createRecord(req, res) {
  try {
    const { title, category, content, classification, tags, metadata, vertical } = req.body;

    const recordData = {
      title,
      category,
      content,
      classification: classification || "INTERNAL",
      tenantId: req.user?.tenantId || req.body.tenantId || "PCPOS",
      vertical: vertical || req.user?.vertical || "SOROK-CORE",
      tags: Array.isArray(tags) ? tags : (typeof tags === "string" ? tags.split(",").map(t => t.trim()) : []),
      metadata: metadata || {},
      status: "active",
      createdBy: req.user?.username || "authenticated_user",
    };

    const created = await DataRecordStore.create(recordData);

    addLog("AUDIT", `Data Record created: '${created.title}' [ID: ${created.id || created._id}, Cat: ${created.category}, Tenant: ${created.tenantId}]`, {
      user: req.user?.username,
      recordId: created.id || created._id,
      classification: created.classification
    });

    return res.status(201).json({
      success: true,
      message: "Data record created successfully.",
      data: created
    });
  } catch (err) {
    addLog("ERROR", `Failed to create data record: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to create data record.",
      details: err.message
    });
  }
}

/**
 * Update an existing data record
 */
export async function updateRecord(req, res) {
  try {
    const { id } = req.params;
    const existing = await DataRecordStore.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Data record with ID '${id}' not found.`
      });
    }

    // Tenant check
    if (req.user && req.user.role !== "admin" && existing.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "Cannot modify record belonging to another tenant."
      });
    }

    const updated = await DataRecordStore.updateById(id, {
      ...req.body,
      updatedBy: req.user?.username
    });

    addLog("AUDIT", `Data Record updated: ID '${id}' (v${updated.version}) by ${req.user?.username}`);

    return res.status(200).json({
      success: true,
      message: "Data record updated successfully.",
      data: updated
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to update record.",
      details: err.message
    });
  }
}

/**
 * Delete a data record
 */
export async function deleteRecord(req, res) {
  try {
    const { id } = req.params;
    const existing = await DataRecordStore.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Data record with ID '${id}' not found.`
      });
    }

    // Only admin or record creator can delete
    if (req.user.role !== "admin" && existing.createdBy !== req.user.username) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "Permission denied. Only administrator or record creator can delete this item."
      });
    }

    await DataRecordStore.deleteById(id);

    addLog("AUDIT", `Data Record deleted: ID '${id}' by ${req.user.username}`);

    return res.status(200).json({
      success: true,
      message: "Data record deleted successfully.",
      deletedId: id
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to delete record.",
      details: err.message
    });
  }
}

/**
 * Search and retrieve statistical breakdown
 */
export async function getRecordStats(req, res) {
  try {
    const tenantFilter = req.user?.role === "admin" ? (req.query.tenantId || "all") : req.user.tenantId;
    const stats = await DataRecordStore.getStats(tenantFilter);

    return res.status(200).json({
      success: true,
      tenant: tenantFilter,
      data: stats
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: err.message
    });
  }
}
