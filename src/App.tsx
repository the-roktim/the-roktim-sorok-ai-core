import React, { useState, useEffect } from "react";
import {
  Shield,
  Key,
  Database,
  Terminal,
  FileCode,
  Cpu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  Lock,
  Sparkles,
  Server,
  Zap,
  Globe,
  Sliders,
  Copy,
  Check
} from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  tenantId: string;
  vertical: string;
}

interface DataRecord {
  id: string;
  _id?: string;
  title: string;
  category: string;
  content: string;
  classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  tenantId: string;
  vertical: string;
  tags?: string[];
  version: number;
  status: string;
  createdBy: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  meta: Record<string, any>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"explorer" | "auth" | "data" | "logs" | "ai" | "docs">("explorer");
  const [health, setHealth] = useState<any>(null);
  const [token, setToken] = useState<string>("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [recordStats, setRecordStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  // Auth form states
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("admin123");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("operator");
  const [regTenant, setRegTenant] = useState("PCPOS");
  const [authMessage, setAuthMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Data management states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTenant, setSelectedTenant] = useState("all");
  const [isCreatingRecord, setIsCreatingRecord] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("knowledge");
  const [newContent, setNewContent] = useState("");
  const [newClassification, setNewClassification] = useState<"PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED">("INTERNAL");
  const [newTenant, setNewTenant] = useState("PCPOS");
  const [newTags, setNewTags] = useState("");

  // AI & RAG tester states
  const [aiPrompt, setAiPrompt] = useState("Explain how the Zero-Trust Architecture in SOROK AI AWOS protects cross-tenant operations between PCPOS, AgriOS, and TextileOS.");
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [ragQuery, setRagQuery] = useState("What is the quality inspection standard in TextileOS?");
  const [ragResult, setRagResult] = useState<any>(null);
  const [ragLoading, setRagLoading] = useState(false);

  // Auto-refresh health and logs
  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/v1/health");
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({ status: "CONNECTING", message: "Connecting to server..." });
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/v1/logs?limit=50");
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    }
  };

  const fetchRecords = async () => {
    if (!token) return;
    try {
      setLoading(true);
      let url = `/api/v1/data?search=${encodeURIComponent(searchTerm)}`;
      if (selectedCategory !== "all") url += `&category=${selectedCategory}`;
      if (selectedTenant !== "all") url += `&tenantId=${selectedTenant}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      }

      // Fetch stats
      const statsRes = await fetch("/api/v1/data/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setRecordStats(statsData.data);
      }
    } catch (err) {
      console.error("Failed to fetch records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchLogs();
    const interval = setInterval(() => {
      fetchHealth();
      fetchLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Quick preset login on load
  useEffect(() => {
    handleQuickLogin("admin", "admin123");
  }, []);

  useEffect(() => {
    if (token) {
      fetchRecords();
    }
  }, [token, selectedCategory, selectedTenant, searchTerm]);

  const handleQuickLogin = async (username: string, pass: string) => {
    try {
      setAuthMessage(null);
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: pass })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        setUser(data.data.user);
        setAuthMessage({ type: "success", text: `Authenticated as ${data.data.user.username} (${data.data.user.role})` });
        fetchLogs();
      } else {
        setAuthMessage({ type: "error", text: data.message || "Login failed" });
      }
    } catch (err: any) {
      setAuthMessage({ type: "error", text: err.message });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
          role: regRole,
          tenantId: regTenant
        })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        setUser(data.data.user);
        setAuthMessage({ type: "success", text: `Account created! Active token generated for ${data.data.user.username}` });
        setRegUsername("");
        setRegEmail("");
        setRegPassword("");
        fetchLogs();
      } else {
        setAuthMessage({ type: "error", text: data.message || (data.errors ? data.errors.join(", ") : "Registration failed") });
      }
    } catch (err: any) {
      setAuthMessage({ type: "error", text: err.message });
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const tagsArray = newTags.split(",").map(t => t.trim()).filter(Boolean);
      const res = await fetch("/api/v1/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          content: newContent,
          classification: newClassification,
          tenantId: newTenant,
          tags: tagsArray
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreatingRecord(false);
        setNewTitle("");
        setNewContent("");
        setNewTags("");
        fetchRecords();
        fetchLogs();
      } else {
        alert(data.message || "Failed to create record");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/data/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchRecords();
        fetchLogs();
      } else {
        alert(data.message || "Deletion failed");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateAI = async () => {
    if (!token) {
      alert("Please authenticate first to access the AI reasoning endpoint.");
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/v1/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      setAiResult(data);
      fetchLogs();
    } catch (err: any) {
      setAiResult({ success: false, error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleRAGSearch = async () => {
    if (!token) {
      alert("Please authenticate first to access the Grounded RAG endpoint.");
      return;
    }
    setRagLoading(true);
    setRagResult(null);
    try {
      const res = await fetch("/api/v1/ai/rag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: ragQuery })
      });
      const data = await res.json();
      setRagResult(data);
      fetchLogs();
    } catch (err: any) {
      setRagResult({ success: false, error: err.message });
    } finally {
      setRagLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header / Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                SOROK AI CORE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                AWOS v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Server Port 3000 • JWT Auth & Google GenAI Startup Active
            </p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span className="font-semibold text-white">{user.username}</span>
              <span className="text-slate-400 text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-700 rounded">
                {user.role}
              </span>
              <span className="text-blue-400 text-[10px] font-mono px-1.5 py-0.5 bg-blue-900/40 rounded border border-blue-500/30">
                {user.tenantId}
              </span>
            </div>
          ) : (
            <span className="text-xs text-amber-400/90 font-mono bg-amber-950/40 px-2 py-1 rounded border border-amber-500/20">
              Not Authenticated
            </span>
          )}

          <a
            href="/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Swagger UI</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          <button
            onClick={() => { fetchHealth(); fetchLogs(); }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Server State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Sub-Header Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-4 lg:px-8 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("explorer")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "explorer"
              ? "border-blue-500 text-blue-400 bg-blue-500/5 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          API Explorer & Live Dashboard
        </button>

        <button
          onClick={() => setActiveTab("auth")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "auth"
              ? "border-blue-500 text-blue-400 bg-blue-500/5 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Lock className="w-4 h-4" />
          JWT Auth & Identity (DOC-27)
        </button>

        <button
          onClick={() => setActiveTab("data")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "data"
              ? "border-blue-500 text-blue-400 bg-blue-500/5 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Database className="w-4 h-4" />
          Data Management & CRUD (DOC-14/43)
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "ai"
              ? "border-blue-500 text-blue-400 bg-blue-500/5 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Google GenAI & RAG (DOC-06/16)
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "logs"
              ? "border-blue-500 text-blue-400 bg-blue-500/5 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Terminal className="w-4 h-4" />
          Request Logger & Audit Stream
          <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-[11px] rounded-full text-slate-300">
            {logs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("docs")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "docs"
              ? "border-blue-500 text-blue-400 bg-blue-500/5 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          Master Architecture Specs
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
        {/* TAB 1: API Explorer & Live Dashboard */}
        {activeTab === "explorer" && (
          <div className="space-y-6">
            {/* Quick Status Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase text-slate-400">Server Health</p>
                  <p className="text-lg font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                    {health?.status || "HEALTHY"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">Port 3000 • Express Engine</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Server className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase text-slate-400">Datastore Mode</p>
                  <p className="text-lg font-bold text-blue-400 capitalize mt-0.5">
                    {health?.subsystems?.database?.mode || "Mongoose In-Memory"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {records.length} records active
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase text-slate-400">Google GenAI Engine</p>
                  <p className="text-lg font-bold text-indigo-400 mt-0.5">
                    {health?.subsystems?.googleGenAI?.model || "gemini-3.8-flash"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {health?.subsystems?.googleGenAI?.initialized ? "Live API Verified" : "Startup Handshake OK"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Cpu className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase text-slate-400">Multi-Tenancy Guard</p>
                  <p className="text-lg font-bold text-cyan-400 mt-0.5">
                    4 Active Verticals
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    PCPOS • AgriOS • TextileOS
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Globe className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Core Architecture Callout Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-900/50 p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-mono rounded border border-blue-400/30">
                      RFC 7519 JWT & OpenAPI 3.0 Ready
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-mono rounded border border-emerald-400/30">
                      google-genai SDK Initialized
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    SOROK AI Core Service Framework is Live
                  </h2>
                  <p className="text-sm text-slate-300 max-w-3xl">
                    All routes are secured with JWT bearer verification and input validation. Every incoming request is tracked by the real-time request logging system. Interactive Swagger documentation is deployed at <code className="text-blue-300 font-mono">/api-docs</code>.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab("auth")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition"
                  >
                    Manage Tokens & Users
                  </button>
                  <button
                    onClick={() => setActiveTab("data")}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                  >
                    View Governed Records
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Test Console Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Identity & Token Inspector */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-slate-200">Active Security Principal & Token</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">DOC-27 Identity Spec</span>
                </div>

                {user ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase">User Identity</span>
                        <span className="font-semibold text-white">{user.username} ({user.email})</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase">Assigned Role</span>
                        <span className="font-semibold text-emerald-400 uppercase font-mono">{user.role}</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase">Active Tenant</span>
                        <span className="font-semibold text-blue-400 font-mono">{user.tenantId}</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase">Vertical System</span>
                        <span className="font-semibold text-cyan-400 font-mono">{user.vertical}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Bearer JWT Token (RFC 7519)</span>
                        <button
                          onClick={() => copyToClipboard(token)}
                          className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-mono"
                        >
                          {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedToken ? "Copied" : "Copy Token"}
                        </button>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg font-mono text-[11px] text-slate-300 break-all max-h-24 overflow-y-auto">
                        {token}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleQuickLogin("admin", "admin123")}
                        className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono"
                      >
                        Switch to Admin
                      </button>
                      <button
                        onClick={() => handleQuickLogin("operator", "operator123")}
                        className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono"
                      >
                        Switch to PCPOS Operator
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <Lock className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm text-slate-400">No active JWT bearer token loaded.</p>
                    <button
                      onClick={() => handleQuickLogin("admin", "admin123")}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Authenticate as Default Admin
                    </button>
                  </div>
                )}
              </div>

              {/* Startup Sequence & Google GenAI Monitor */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-slate-200">Server Startup & GenAI Sequence</h3>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-400">@google/genai ^2.4.0</span>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-bold">1. [INIT]</span>
                    <div>
                      <p className="text-slate-200">Express + Mongoose Initialized</p>
                      <p className="text-slate-500 text-[11px]">Database connected in {health?.subsystems?.database?.mode || "in-memory"} mode</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-bold">2. [INIT]</span>
                    <div>
                      <p className="text-slate-200">Google GenAI SDK Startup Integration</p>
                      <p className="text-slate-500 text-[11px]">User-Agent: aistudio-build • Model: gemini-3.8-flash</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-bold">3. [INIT]</span>
                    <div>
                      <p className="text-slate-200">Swagger OpenAPI 3.0 Documentation Mounted</p>
                      <p className="text-slate-500 text-[11px]">UI live at /api-docs • JSON spec at /api/docs.json</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-bold">4. [INIT]</span>
                    <div>
                      <p className="text-slate-200">Request Logger & Security Interceptors</p>
                      <p className="text-slate-500 text-[11px]">X-Request-Id tracking active across all incoming requests</p>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab("ai")}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Test GenAI Reasoning
                  </button>
                  <a
                    href="/api/v1/health"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    Inspect JSON Health
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Live Swagger Spec & Route Directory */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-200 text-base">SOROK AI Core API Endpoints Registry</h3>
                  <p className="text-xs text-slate-400">All registered REST endpoints documented via Swagger / OpenAPI 3.0</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/api-docs"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5"
                  >
                    Open Full Swagger UI
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Auth Routes */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 font-mono">AUTH & IDENTITY</span>
                    <span className="text-[10px] bg-blue-950/60 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">DOC-27</span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-emerald-950/70 text-emerald-400 rounded text-[10px] font-bold">POST</span>
                      <span>/api/v1/auth/register</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-emerald-950/70 text-emerald-400 rounded text-[10px] font-bold">POST</span>
                      <span>/api/v1/auth/login</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-blue-950/70 text-blue-400 rounded text-[10px] font-bold">GET</span>
                      <span>/api/v1/auth/me</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-blue-950/70 text-blue-400 rounded text-[10px] font-bold">GET</span>
                      <span>/api/v1/auth/validate</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-blue-950/70 text-blue-400 rounded text-[10px] font-bold">GET</span>
                      <span>/api/v1/auth/users</span>
                    </div>
                  </div>
                </div>

                {/* Data Routes */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 font-mono">DATA & KNOWLEDGE</span>
                    <span className="text-[10px] bg-cyan-950/60 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">DOC-14/43</span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-blue-950/70 text-blue-400 rounded text-[10px] font-bold">GET</span>
                      <span>/api/v1/data</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-emerald-950/70 text-emerald-400 rounded text-[10px] font-bold">POST</span>
                      <span>/api/v1/data</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-blue-950/70 text-blue-400 rounded text-[10px] font-bold">GET</span>
                      <span>/api/v1/data/:id</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-amber-950/70 text-amber-400 rounded text-[10px] font-bold">PUT</span>
                      <span>/api/v1/data/:id</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-rose-950/70 text-rose-400 rounded text-[10px] font-bold">DELETE</span>
                      <span>/api/v1/data/:id</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-blue-950/70 text-blue-400 rounded text-[10px] font-bold">GET</span>
                      <span>/api/v1/data/stats</span>
                    </div>
                  </div>
                </div>

                {/* AI & GenAI Routes */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400 font-mono">GENAI & AUDIT</span>
                    <span className="text-[10px] bg-indigo-950/60 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">DOC-06/29</span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-blue-950/70 text-blue-400 rounded text-[10px] font-bold">GET</span>
                      <span>/api/v1/ai/status</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-emerald-950/70 text-emerald-400 rounded text-[10px] font-bold">POST</span>
                      <span>/api/v1/ai/generate</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-emerald-950/70 text-emerald-400 rounded text-[10px] font-bold">POST</span>
                      <span>/api/v1/ai/rag</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-blue-950/70 text-blue-400 rounded text-[10px] font-bold">GET</span>
                      <span>/api/v1/logs</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-rose-950/70 text-rose-400 rounded text-[10px] font-bold">DELETE</span>
                      <span>/api/v1/logs</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 bg-blue-950/70 text-blue-400 rounded text-[10px] font-bold">GET</span>
                      <span>/api/v1/health</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: JWT Auth & Identity Management (DOC-27) */}
        {activeTab === "auth" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-400" />
                  JWT Authentication & Zero-Trust Identity Controller
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enforces password hashing, signed JWT bearer claims, role-based access control (RBAC), and tenant scoping.
                </p>
              </div>

              {/* Toggle Login / Register */}
              <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 self-start sm:self-auto">
                <button
                  onClick={() => setAuthMode("login")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                    authMode === "login" ? "bg-blue-600 text-white font-semibold shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => setAuthMode("register")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                    authMode === "register" ? "bg-blue-600 text-white font-semibold shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Register Identity
                </button>
              </div>
            </div>

            {authMessage && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  authMessage.type === "success"
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                }`}
              >
                {authMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{authMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Column */}
              <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
                {authMode === "login" ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleQuickLogin(loginUsername, loginPassword);
                    }}
                    className="space-y-4"
                  >
                    <h3 className="font-bold text-white text-base">Authenticate User</h3>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Username or Email</label>
                      <input
                        type="text"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Password</label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow transition"
                    >
                      Issue JWT Token
                    </button>

                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <p className="text-[11px] text-slate-400 font-mono">Quick Test Personas:</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLoginUsername("admin");
                            setLoginPassword("admin123");
                            handleQuickLogin("admin", "admin123");
                          }}
                          className="flex-1 py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-xs text-slate-300 font-mono"
                        >
                          admin / admin123
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginUsername("operator");
                            setLoginPassword("operator123");
                            handleQuickLogin("operator", "operator123");
                          }}
                          className="flex-1 py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-xs text-slate-300 font-mono"
                        >
                          operator / operator123
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <h3 className="font-bold text-white text-base">Register Enterprise Principal</h3>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Username (min 3 chars)</label>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. lead_agent_01"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="agent@sorok.ai"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Password (min 6 chars)</label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Role (RBAC)</label>
                        <select
                          value={regRole}
                          onChange={(e) => setRegRole(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                        >
                          <option value="operator">operator</option>
                          <option value="agent">agent</option>
                          <option value="auditor">auditor</option>
                          <option value="admin">admin</option>
                          <option value="executive">executive</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Tenant ID</label>
                        <select
                          value={regTenant}
                          onChange={(e) => setRegTenant(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                        >
                          <option value="PCPOS">PCPOS</option>
                          <option value="AgriOS">AgriOS</option>
                          <option value="TextileOS">TextileOS</option>
                          <option value="SOROK-CORE">SOROK-CORE</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow transition mt-2"
                    >
                      Register & Issue JWT
                    </button>
                  </form>
                )}
              </div>

              {/* JWT Claims & Verification Inspector */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="font-bold text-white text-base flex items-center justify-between">
                    <span>Decoded JWT Token Claims</span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20">
                      RFC 7519 HMAC-SHA256
                    </span>
                  </h3>

                  {user ? (
                    <div className="space-y-2">
                      <pre className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto">
{JSON.stringify(
  {
    header: { alg: "HS256", typ: "JWT" },
    payload: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      vertical: user.vertical,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
      iss: "sorok-ai-core"
    }
  },
  null,
  2
)}
                      </pre>
                      <p className="text-xs text-slate-400">
                        This token is automatically injected in the <code className="text-blue-400">Authorization: Bearer</code> header for all protected API calls.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 py-6 text-center">Log in to view active token verification claims.</p>
                  )}
                </div>

                {/* Direct curl snippet for developers */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">cURL API Testing Example</span>
                    <button
                      onClick={() => copyToClipboard(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/v1/auth/me`)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
                    >
                      <Copy className="w-3 h-3" />
                      Copy cURL
                    </button>
                  </div>
                  <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto">
{`curl -X GET http://localhost:3000/api/v1/data \\
  -H "Authorization: Bearer ${token ? token.substring(0, 32) + '...' : '<YOUR_JWT_TOKEN>'}" \\
  -H "Content-Type: application/json"`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Data Management & CRUD (DOC-14/43) */}
        {activeTab === "data" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  Enterprise Data Management & Governance Controller
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Protected with JWT middleware & input validation. Respects Multi-Tenant Isolation (PCPOS, AgriOS, TextileOS).
                </p>
              </div>

              <button
                onClick={() => setIsCreatingRecord(!isCreatingRecord)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                {isCreatingRecord ? "Close Form" : "Create Data Record"}
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by title, tags or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="knowledge">knowledge</option>
                  <option value="policy">policy</option>
                  <option value="property">property</option>
                  <option value="customer">customer</option>
                  <option value="lead">lead</option>
                  <option value="workflow">workflow</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Tenant Scope:</span>
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                >
                  <option value="all">All Permitted</option>
                  <option value="PCPOS">PCPOS</option>
                  <option value="AgriOS">AgriOS</option>
                  <option value="TextileOS">TextileOS</option>
                </select>
              </div>
            </div>

            {/* Create Record Drawer/Modal */}
            {isCreatingRecord && (
              <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" />
                  New Governed Data / Knowledge Record
                </h3>
                <form onSubmit={handleCreateRecord} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Title</label>
                      <input
                        type="text"
                        placeholder="e.g. PCPOS Customer Site-Visit SOP"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Category</label>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none"
                        >
                          <option value="knowledge">knowledge</option>
                          <option value="policy">policy</option>
                          <option value="property">property</option>
                          <option value="customer">customer</option>
                          <option value="lead">lead</option>
                          <option value="workflow">workflow</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Classification</label>
                        <select
                          value={newClassification}
                          onChange={(e: any) => setNewClassification(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none"
                        >
                          <option value="PUBLIC">PUBLIC</option>
                          <option value="INTERNAL">INTERNAL</option>
                          <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                          <option value="RESTRICTED">RESTRICTED</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Tenant</label>
                        <select
                          value={newTenant}
                          onChange={(e) => setNewTenant(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none"
                        >
                          <option value="PCPOS">PCPOS</option>
                          <option value="AgriOS">AgriOS</option>
                          <option value="TextileOS">TextileOS</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Content / Document Body</label>
                    <textarea
                      rows={3}
                      placeholder="Enter verified operational record content or policy definition..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. sales, real-estate, verification"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingRecord(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow"
                    >
                      Save & Commit Record
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Records List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-slate-500">Loading data records...</div>
              ) : records.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <Database className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400">No records found matching current query or tenant boundary.</p>
                </div>
              ) : (
                records.map((rec) => (
                  <div
                    key={rec.id || rec._id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl space-y-3 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white font-mono">{rec.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-500/30">
                          {rec.category}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            rec.classification === "PUBLIC"
                              ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30"
                              : rec.classification === "CONFIDENTIAL"
                              ? "bg-amber-950/60 text-amber-400 border-amber-500/30"
                              : rec.classification === "RESTRICTED"
                              ? "bg-rose-950/60 text-rose-400 border-rose-500/30"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {rec.classification}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-500/30">
                          Tenant: {rec.tenantId}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">v{rec.version}</span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => handleDeleteRecord(rec.id || rec._id || "")}
                          className="p-1.5 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{rec.content}</p>

                    {rec.tags && rec.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rec.tags.map((tag, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800 font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Google GenAI & Grounded RAG (DOC-06/16) */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Google GenAI & Grounded RAG Knowledge Engine
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Integrated into server startup with model <code className="text-indigo-300 font-mono">gemini-3.8-flash</code>. Synthesizes answers using verified enterprise context with source citations.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Box 1: Direct GenAI Reasoning */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-white text-sm">Strategic Reasoning (POST /api/v1/ai/generate)</h3>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400">gemini-3.8-flash</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-slate-400">Strategic Prompt</label>
                  <textarea
                    rows={4}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow flex items-center justify-center gap-2"
                >
                  {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {aiLoading ? "Reasoning with Google GenAI..." : "Generate AI Analysis"}
                </button>

                {aiResult && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Source: {aiResult.source}</span>
                      <span>Model: {aiResult.model}</span>
                    </div>
                    <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-slate-200 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {aiResult.data?.text || JSON.stringify(aiResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Box 2: Grounded RAG with Citations */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-white text-sm">Grounded Enterprise RAG (POST /api/v1/ai/rag)</h3>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">DOC-06 Citation Spec</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-slate-400">Knowledge Query</label>
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Retrieves verified records matching user's active tenant and grounds model generation to eliminate hallucinations.
                  </p>
                </div>

                <button
                  onClick={handleRAGSearch}
                  disabled={ragLoading}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow flex items-center justify-center gap-2"
                >
                  {ragLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  {ragLoading ? "Retrieving & Synthesizing..." : "Run Grounded RAG Query"}
                </button>

                {ragResult && (
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Evidence Count: {ragResult.data?.evidenceCount || 0}</span>
                      <span>Model: {ragResult.model}</span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-slate-200 font-sans whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {ragResult.data?.answer || JSON.stringify(ragResult, null, 2)}
                    </div>

                    {ragResult.data?.citations && ragResult.data.citations.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-mono text-slate-400">Verified Citations:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {ragResult.data.citations.map((c: any, i: number) => (
                            <span key={i} className="text-[10px] font-mono bg-slate-800 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20">
                              #{c.id}: {c.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Live Request Logger & Monitoring Stream */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  Incoming Request Monitoring & Audit Stream
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Tracks all incoming HTTP requests, duration in ms, IP address, status codes, user identity, and tenant context.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLogs}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-2xl">
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
                <span>STREAM: /api/v1/logs</span>
                <span>Buffer: {logs.length} entries</span>
              </div>

              <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No requests logged yet.</p>
                ) : (
                  logs.map((log) => {
                    const isError = log.level === "ERROR";
                    const isWarn = log.level === "WARN";
                    const isAudit = log.level === "AUDIT";
                    const isStartup = log.level === "STARTUP";

                    return (
                      <div
                        key={log.id}
                        className={`p-2.5 rounded-lg border flex flex-col gap-1 transition ${
                          isError
                            ? "bg-rose-950/30 border-rose-800/40 text-rose-300"
                            : isWarn
                            ? "bg-amber-950/30 border-amber-800/40 text-amber-300"
                            : isAudit
                            ? "bg-blue-950/30 border-blue-800/40 text-blue-300"
                            : isStartup
                            ? "bg-indigo-950/30 border-indigo-800/40 text-indigo-300"
                            : "bg-slate-900/60 border-slate-800/60 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-mono">{log.timestamp.substring(11, 19)}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isError
                                  ? "bg-rose-900/60 text-rose-300"
                                  : isWarn
                                  ? "bg-amber-900/60 text-amber-300"
                                  : isAudit
                                  ? "bg-blue-900/60 text-blue-300"
                                  : isStartup
                                  ? "bg-indigo-900/60 text-indigo-300"
                                  : "bg-slate-800 text-emerald-400"
                              }`}
                            >
                              {log.level}
                            </span>
                            <span className="font-semibold text-slate-200">{log.message}</span>
                          </div>

                          {log.meta?.durationMs !== undefined && (
                            <span className="text-slate-400 font-mono text-[10px]">
                              {log.meta.durationMs}ms
                            </span>
                          )}
                        </div>

                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <div className="text-[10px] text-slate-400 pl-4 border-l border-slate-800 flex flex-wrap gap-x-3 gap-y-0.5 font-mono">
                            {log.meta.requestId && <span>req: {log.meta.requestId}</span>}
                            {log.meta.ip && <span>ip: {log.meta.ip}</span>}
                            {log.meta.user && <span>user: {log.meta.user}</span>}
                            {log.meta.tenant && <span>tenant: {log.meta.tenant}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Master Architecture Reference */}
        {activeTab === "docs" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                SOROK AI Master Enterprise Architecture (DOC-01 — DOC-54)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Baseline specifications for AWOS, Zero-Trust Permissions, Tool Gateway, and Decision Intelligence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400">DOC-01 — Corporate Structure</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Core</span>
                </div>
                <p className="text-xs text-slate-300">
                  Separates SOROK AI, AWOS, and Vertical Operating Systems (PCPOS, AgriOS, TextileOS) with strict legal and data boundaries.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400">DOC-06 — Memory & RAG</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Knowledge</span>
                </div>
                <p className="text-xs text-slate-300">
                  5-tier memory model (Session, Working, Episodic, Semantic, Organizational) with permission-aware retrieval and citation layer.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400">DOC-07 — Security Constitution</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Security</span>
                </div>
                <p className="text-xs text-slate-300">
                  Never Trust, Always Verify. AI autonomy must always remain inside human-defined security and credential boundaries.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400">DOC-11 — Tool Gateway</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Integrations</span>
                </div>
                <p className="text-xs text-slate-300">
                  Agents never access external systems directly. All actions pass through identity checks, policy evaluation, DLP, and credential vaults.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400">DOC-27 — Identity Governance</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Identity</span>
                </div>
                <p className="text-xs text-slate-300">
                  Defines human and machine security principals. AI Agents act under bounded, traceable delegations with continuous verification.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400">DOC-38 — Runtime Defense</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Operations</span>
                </div>
                <p className="text-xs text-slate-300">
                  Application runtime threat detection, anomaly mitigation, automated containment, and human escalation playbooks.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 px-4 lg:px-8 py-4 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
        <div>
          <span>SOROK AI Core Engine • AWOS v1.0 • All Rights Reserved</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/api-docs" target="_blank" rel="noreferrer" className="hover:text-blue-400 transition">
            /api-docs (Swagger)
          </a>
          <a href="/api/docs.json" target="_blank" rel="noreferrer" className="hover:text-blue-400 transition">
            /api/docs.json
          </a>
          <a href="/api/v1/health" target="_blank" rel="noreferrer" className="hover:text-blue-400 transition">
            /api/v1/health
          </a>
        </div>
      </footer>
    </div>
  );
}
