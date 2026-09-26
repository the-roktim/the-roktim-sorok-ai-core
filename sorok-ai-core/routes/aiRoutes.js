import express from "express";
import { authenticateJWT, enforceTenantBoundary } from "../middleware/authMiddleware.js";
import { getGenAIClient, getGenAIStatus } from "../config/gemini.js";
import { DataRecordStore } from "../models/DataRecord.js";
import { addLog } from "../utils/logger.js";

const router = express.Router();

/**
 * @openapi
 * /api/v1/ai/status:
 *   get:
 *     summary: Check Google GenAI Engine integration status
 *     tags:
 *       - AI & Decision Intelligence
 *     responses:
 *       200:
 *         description: Current status of Google GenAI SDK integration
 */
router.get("/status", (req, res) => {
  const status = getGenAIStatus();
  return res.status(200).json({
    success: true,
    data: status
  });
});

/**
 * @openapi
 * /api/v1/ai/generate:
 *   post:
 *     summary: Generate context-aware AI completion using Google GenAI
 *     tags:
 *       - AI & Decision Intelligence
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: "Explain the multi-tenant isolation principle in SOROK AI AWOS"
 *               systemInstruction:
 *                 type: string
 *                 example: "You are the SOROK AI Core Strategic Intelligence Engine."
 *               temperature:
 *                 type: number
 *                 example: 0.7
 *     responses:
 *       200:
 *         description: Successful AI generation
 *       401:
 *         description: Unauthorized
 */
router.post("/generate", authenticateJWT, async (req, res) => {
  try {
    const { prompt, systemInstruction } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Prompt is required and must be a string."
      });
    }

    const ai = getGenAIClient();

    if (!ai) {
      // Graceful simulated AI response if GEMINI_API_KEY is not configured
      const simulatedText = `[SOROK AI Core Engine - Simulated Model Response]\n\nAnalysis for query: "${prompt}"\n\n- Scope: ${req.user.vertical} (Tenant: ${req.user.tenantId})\n- Policy Enforcement: Zero-Trust Identity Verified (${req.user.username}, role: ${req.user.role})\n- Strategic Note: Google GenAI SDK is integrated into startup. Configure valid GEMINI_API_KEY in environment for live model calls.`;
      
      addLog("INFO", `Simulated AI generation requested by ${req.user.username}`);
      return res.status(200).json({
        success: true,
        source: "simulated-engine",
        model: "gemini-3.8-flash (offline mode)",
        data: {
          text: simulatedText,
          user: req.user.username,
          tenantId: req.user.tenantId
        }
      });
    }

    addLog("INFO", `Calling Google GenAI model 'gemini-3.8-flash' for user '${req.user.username}'`);

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are the SOROK AI Core Enterprise Intelligence System. Provide structured, precise, evidence-grounded responses.",
        temperature: 0.7
      }
    });

    const textOutput = response.text || "";

    return res.status(200).json({
      success: true,
      source: "google-genai",
      model: "gemini-3.8-flash",
      data: {
        text: textOutput,
        user: req.user.username,
        tenantId: req.user.tenantId
      }
    });
  } catch (err) {
    addLog("ERROR", `GenAI generation error: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: "AI_GENERATION_FAILED",
      message: err.message
    });
  }
});

/**
 * @openapi
 * /api/v1/ai/rag:
 *   post:
 *     summary: Perform grounded RAG knowledge search & reasoning
 *     tags:
 *       - AI & Decision Intelligence
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 example: "What are the quality inspection tolerances in TextileOS?"
 *               category:
 *                 type: string
 *                 example: "policy"
 *     responses:
 *       200:
 *         description: Grounded RAG answer with verified citations
 */
router.post("/rag", authenticateJWT, enforceTenantBoundary, async (req, res) => {
  try {
    const { query, category } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Search query is required."
      });
    }

    // Step 1: Permission-aware retrieval of knowledge records matching tenant
    const searchFilter = {
      search: query,
      tenantId: req.user.role === "admin" ? req.body.tenantId : req.user.tenantId
    };
    if (category) searchFilter.category = category;

    const retrievedRecords = await DataRecordStore.find(searchFilter);

    // Step 2: Assemble ground truth context
    const contextEvidence = retrievedRecords.map((r, i) => 
      `[Source #${i + 1} | ID: ${r.id || r._id} | Cat: ${r.category} | Tenant: ${r.tenantId} | Classification: ${r.classification}]\nTitle: ${r.title}\nContent: ${r.content}`
    ).join("\n\n");

    const ai = getGenAIClient();

    if (!ai) {
      return res.status(200).json({
        success: true,
        source: "simulated-rag",
        model: "gemini-3.8-flash (offline mode)",
        data: {
          answer: retrievedRecords.length > 0 
            ? `Based on ${retrievedRecords.length} retrieved verified records for tenant ${req.user.tenantId}:\n\n` + retrievedRecords.map(r => `• ${r.title}: ${r.content.substring(0, 150)}...`).join("\n")
            : "No verified knowledge records found matching this query in current tenant scope.",
          citations: retrievedRecords.map(r => ({ id: r.id || r._id, title: r.title, category: r.category })),
          evidenceCount: retrievedRecords.length
        }
      });
    }

    const ragPrompt = `You are the SOROK AI Enterprise Knowledge Engine.
Answer the user's question using ONLY the provided verified context records.
If the context does not contain sufficient evidence, state: "Insufficient information in authorized knowledge base."
Always cite sources explicitly.

USER QUESTION: "${query}"

AUTHORIZED ENTERPRISE CONTEXT:
${contextEvidence || "NO RECORDS FOUND"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: ragPrompt,
      config: {
        systemInstruction: "You are the SOROK AI Knowledge & RAG Reasoning Engine (DOC-06). Never invent facts.",
        temperature: 0.2
      }
    });

    return res.status(200).json({
      success: true,
      source: "google-genai",
      model: "gemini-3.8-flash",
      data: {
        answer: response.text || "",
        citations: retrievedRecords.map(r => ({ id: r.id || r._id, title: r.title, category: r.category })),
        evidenceCount: retrievedRecords.length
      }
    });
  } catch (err) {
    addLog("ERROR", `RAG execution failed: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: "RAG_PROCESSING_FAILED",
      message: err.message
    });
  }
});

export default router;
