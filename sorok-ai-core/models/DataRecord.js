import mongoose from "mongoose";

const dataRecordSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["knowledge", "policy", "customer", "lead", "workflow", "property", "general"],
      default: "general",
    },
    content: {
      type: String,
      required: true,
    },
    classification: {
      type: String,
      enum: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
      default: "INTERNAL",
    },
    tenantId: {
      type: String,
      required: true,
      default: "PCPOS",
    },
    vertical: {
      type: String,
      enum: ["SOROK-CORE", "PCPOS", "AgriOS", "TextileOS"],
      default: "SOROK-CORE",
    },
    tags: [{ type: String }],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ["active", "archived", "quarantined", "draft"],
      default: "active",
    },
    createdBy: {
      type: String,
      default: "system",
    },
  },
  {
    timestamps: true,
  }
);

export const DataRecordModel = mongoose.models.DataRecord || mongoose.model("DataRecord", dataRecordSchema);

// In-Memory store for standalone / fallback mode
const inMemoryRecords = new Map();

// Seed initial records reflecting the SOROK AI Architecture domains
const seedRecords = [
  {
    id: "rec_pcpos_001",
    _id: "rec_pcpos_001",
    title: "PCPOS Verified Real Estate Listing - Park City Green Valley",
    category: "property",
    content: "3-Bedroom residential luxury apartment in Sector 11, Uttara, Dhaka. 1850 sq ft with dedicated car parking, 24/7 security surveillance and RAJUK approval reference #RAJ-2026-9042.",
    classification: "INTERNAL",
    tenantId: "PCPOS",
    vertical: "PCPOS",
    tags: ["real-estate", "dhaka", "verified", "uttara"],
    metadata: { priceBDT: "18500000", squareFeet: 1850, verifiedBy: "Inspector AGT-VERIFY-03" },
    version: 1,
    status: "active",
    createdBy: "admin",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rec_agrios_002",
    _id: "rec_agrios_002",
    title: "AgriOS Master Crop Advisory: Aman Rice Pest Control",
    category: "knowledge",
    content: "Recommended integrated pest management (IPM) guidelines for BPH (Brown Planthopper) in Aman season crops across Rajshahi and Rangpur agricultural zones.",
    classification: "PUBLIC",
    tenantId: "AgriOS",
    vertical: "AgriOS",
    tags: ["agriculture", "rice", "pest-control", "bengali-farming"],
    metadata: { season: "Aman", zone: "Rajshahi", approvalStatus: "Approved by Agronomist" },
    version: 2,
    status: "active",
    createdBy: "admin",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rec_textile_003",
    _id: "rec_textile_003",
    title: "TextileOS Standard Operating Procedure: Buyer Quality Inspection v1.4",
    category: "policy",
    content: "Four-point fabric inspection system standard procedures for European RMG apparel export batches. Tolerance limit 2.5 AQL.",
    classification: "CONFIDENTIAL",
    tenantId: "TextileOS",
    vertical: "TextileOS",
    tags: ["rmg", "export", "quality-control", "aql"],
    metadata: { standard: "AQL 2.5", certifiedBy: "ISO-9001 Compliance Lead" },
    version: 1,
    status: "active",
    createdBy: "admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

seedRecords.forEach(rec => inMemoryRecords.set(rec.id, rec));

export const DataRecordStore = {
  async find(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await DataRecordModel.find(query).sort({ createdAt: -1 });
      } catch {
        // Fallback
      }
    }

    let records = Array.from(inMemoryRecords.values());
    if (query.category) records = records.filter(r => r.category === query.category);
    if (query.tenantId) records = records.filter(r => r.tenantId === query.tenantId);
    if (query.classification) records = records.filter(r => r.classification === query.classification);
    if (query.status) records = records.filter(r => r.status === query.status);
    if (query.search) {
      const q = query.search.toLowerCase();
      records = records.filter(r => 
        r.title.toLowerCase().includes(q) || 
        r.content.toLowerCase().includes(q) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    return records;
  },

  async findById(id) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await DataRecordModel.findById(id);
      } catch {
        // Fallback
      }
    }
    return inMemoryRecords.get(id) || Array.from(inMemoryRecords.values()).find(r => r.id === id || r._id === id) || null;
  },

  async create(data) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await DataRecordModel.create(data);
      } catch (err) {
        if (!err.message.includes('buffering timed out')) {
          throw err;
        }
      }
    }

    const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id,
      _id: id,
      ...data,
      version: 1,
      status: data.status || "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    inMemoryRecords.set(id, record);
    return record;
  },

  async updateById(id, updateData) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await DataRecordModel.findByIdAndUpdate(
          id,
          { ...updateData, $inc: { version: 1 } },
          { new: true }
        );
      } catch {
        // Fallback
      }
    }

    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updateData,
      version: (existing.version || 1) + 1,
      updatedAt: new Date().toISOString()
    };
    inMemoryRecords.set(existing.id || existing._id, updated);
    return updated;
  },

  async deleteById(id) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await DataRecordModel.findByIdAndDelete(id);
      } catch {
        // Fallback
      }
    }

    const key = Array.from(inMemoryRecords.keys()).find(k => k === id || inMemoryRecords.get(k)._id === id);
    if (key) {
      const deleted = inMemoryRecords.get(key);
      inMemoryRecords.delete(key);
      return deleted;
    }
    return null;
  },

  async getStats(tenantId = null) {
    let records = Array.from(inMemoryRecords.values());
    if (tenantId && tenantId !== "all") {
      records = records.filter(r => r.tenantId === tenantId);
    }

    const categoryBreakdown = {};
    const classificationBreakdown = {};

    records.forEach(r => {
      categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1;
      classificationBreakdown[r.classification] = (classificationBreakdown[r.classification] || 0) + 1;
    });

    return {
      totalRecords: records.length,
      categoryBreakdown,
      classificationBreakdown
    };
  }
};
