import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "SOROK AI Core Enterprise API",
    version: "1.0.0",
    description: `
**SOROK AI Core Architecture (DOC-01 — DOC-54 Baseline)**

The central API gateway and enterprise execution engine for SOROK AI, powering:
- **AWOS (AI Workforce Operating System)** & Department Agents
- **Zero-Trust Identity & Access Governance (DOC-27)**
- **Enterprise Knowledge, RAG & Memory (DOC-06 / DOC-18)**
- **Operational Data Platform & Master Data Management (DOC-14 / DOC-43)**
- **Google GenAI Startup Integration (gemini-3.8-flash)**

All endpoints require JWT Bearer Authentication and enforce strict tenant-boundary isolation between **PCPOS**, **AgriOS**, **TextileOS**, and **SOROK Core**.
    `,
    contact: {
      name: "SOROK AI System Architecture Team",
      email: "contact.sohanbabu@gmail.com",
    },
    license: {
      name: "Apache 2.0",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
    },
  },
  servers: [
    {
      url: "/",
      description: "SOROK AI Core Production/Dev Host",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token obtained from `/api/v1/auth/login` or `/api/v1/auth/register`",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "usr_admin_001" },
          username: { type: "string", example: "admin" },
          email: { type: "string", format: "email", example: "admin@sorok.ai" },
          fullName: { type: "string", example: "SOROK Chief Governance Officer" },
          role: { type: "string", enum: ["admin", "executive", "operator", "auditor", "agent"], example: "admin" },
          tenantId: { type: "string", example: "SOROK-CORPORATE" },
          vertical: { type: "string", enum: ["SOROK-CORE", "PCPOS", "AgriOS", "TextileOS"], example: "SOROK-CORE" },
          status: { type: "string", example: "active" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["username", "email", "password"],
        properties: {
          username: { type: "string", minLength: 3, example: "sohan_lead" },
          email: { type: "string", format: "email", example: "sohan@pcpos.bd" },
          password: { type: "string", minLength: 6, example: "Secret123!" },
          fullName: { type: "string", example: "Sohan Babu" },
          role: { type: "string", enum: ["admin", "executive", "operator", "auditor", "agent"], default: "operator" },
          tenantId: { type: "string", enum: ["PCPOS", "AgriOS", "TextileOS", "SOROK-CORE"], default: "PCPOS" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["password"],
        properties: {
          username: { type: "string", example: "admin" },
          email: { type: "string", format: "email", example: "admin@sorok.ai" },
          password: { type: "string", example: "admin123" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Authentication successful." },
          data: {
            type: "object",
            properties: {
              token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
              tokenType: { type: "string", example: "Bearer" },
              expiresIn: { type: "string", example: "24h" },
              user: { $ref: "#/components/schemas/User" },
            },
          },
        },
      },
      DataRecord: {
        type: "object",
        properties: {
          id: { type: "string", example: "rec_pcpos_001" },
          title: { type: "string", example: "Park City Green Valley Verified Residential Unit" },
          category: { type: "string", enum: ["knowledge", "policy", "customer", "lead", "workflow", "property", "general"], example: "property" },
          content: { type: "string", example: "3-Bedroom residential luxury apartment in Sector 11, Uttara, Dhaka..." },
          classification: { type: "string", enum: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"], example: "INTERNAL" },
          tenantId: { type: "string", example: "PCPOS" },
          vertical: { type: "string", example: "PCPOS" },
          tags: { type: "array", items: { type: "string" }, example: ["real-estate", "dhaka"] },
          metadata: { type: "object", example: { priceBDT: 18500000, squareFeet: 1850 } },
          version: { type: "number", example: 1 },
          status: { type: "string", example: "active" },
          createdBy: { type: "string", example: "admin" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateDataRecordRequest: {
        type: "object",
        required: ["title", "category", "content"],
        properties: {
          title: { type: "string", example: "AgriOS Crop Advisory: BPH Resistance Protocol" },
          category: { type: "string", enum: ["knowledge", "policy", "customer", "lead", "workflow", "property", "general"], example: "knowledge" },
          content: { type: "string", example: "Approved bio-pesticide rotation schedule for paddy crops during monsoon." },
          classification: { type: "string", enum: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"], default: "INTERNAL" },
          tenantId: { type: "string", example: "AgriOS" },
          tags: { type: "array", items: { type: "string" }, example: ["agriculture", "pest-management"] },
          metadata: { type: "object", example: { region: "Rajshahi", season: "Kharif" } },
        },
      },
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation completed successfully." },
          data: { type: "object" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "UNAUTHORIZED" },
          message: { type: "string", example: "Access denied. Valid Bearer JWT token required." },
          errors: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [
    "./sorok-ai-core/routes/*.js",
    "./sorok-ai-core/routes/*.ts",
    "./routes/*.js",
    "./routes/*.ts"
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
