import { Type } from "@sinclair/typebox";
import * as lancedb from "@lancedb/lancedb";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { stringEnum } from "openclaw/plugin-sdk";
import { MEMORY_CATEGORIES, memoryConfigSchema, vectorDimsForModel } from "./config.js";
const TABLE_NAME = "memories";
class MemoryDB {
  db = null;
  table = null;
  initPromise = null;
  constructor(dbPath, vectorDim) {
  }
  constructor() {
    if (this.table) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }
  constructor() {
    this.db = await lancedb.connect(this.dbPath);
    const tables = await this.db.tableNames();
    if (tables.includes(TABLE_NAME)) {
      this.table = await this.db.openTable(TABLE_NAME);
    } else {
      this.table = await this.db.createTable(TABLE_NAME, [{ id: "__schema__", text: "", vector: new Array(this.vectorDim).fill(0), importance: 0, category: "other", createdAt: 0 }]);
      await this.table.delete("id = \"__schema__\"");
    }
  }
  constructor(entry) {
    await this.ensureInitialized();
    const fullEntry = { ...entry: , id: randomUUID(), createdAt: Date.now() };
    await this.table.add([fullEntry]);
    return fullEntry;
  }
  constructor(vector, limit = 5, minScore = 0.5) {
    await this.ensureInitialized();
    const results = await this.table.vectorSearch(vector).limit(limit).toArray();
    const mapped = results.map((row) => {
      const distance = (row._distance ?? 0);
      const score = (1 / (1 + distance));
      return { entry: { id: row.id, text: row.text, vector: row.vector, importance: row.importance, category: row.category, createdAt: row.createdAt }, score };
    });
    return mapped.filter((r) => (r.score >= minScore));
  }
  constructor(id) {
    await this.ensureInitialized();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error("Invalid memory ID format: ");
    }
    await this.table.delete("id = ''");
    return true;
  }
  constructor() {
    await this.ensureInitialized();
    return this.table.countRows();
  }
}
class Embeddings {
  client;
  constructor(apiKey, model) {
    this.client = new OpenAI({ apiKey });
  }
  constructor(text) {
    const response = await this.client.embeddings.create({ model: this.model, input: text });
    return response.data[0].embedding;
  }
}
const MEMORY_TRIGGERS = [/zapamatuj si|pamatuj|remember/i, /preferuji|radši|nechci|prefer/i, /rozhodli jsme|budeme používat/i, /\+\d{10,}/, /[\w.-]+@[\w.-]+\.\w+/, /můj\s+\w+\s+je|je\s+můj/i, /my\s+\w+\s+is|is\s+my/i, /i (like|prefer|hate|love|want|need)/i, /always|never|important/i];
function shouldCapture(text) {
  if (((text.length < 10) || (text.length > 500))) {
    return false;
  }
  if (text.includes("<relevant-memories>")) {
    return false;
  }
  if ((text.startsWith("<") && text.includes("</"))) {
    return false;
  }
  if ((text.includes("**") && text.includes("
-"))) {
    return false;
  }
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if ((emojiCount > 3)) {
    return false;
  }
  return MEMORY_TRIGGERS.some((r) => r.test(text));
}
function detectCategory(text) {
  const lower = text.toLowerCase();
  if (/prefer|radši|like|love|hate|want/i.test(lower)) {
    return "preference";
  }
  if (/rozhodli|decided|will use|budeme/i.test(lower)) {
    return "decision";
  }
  if (/\+\d{10,}|@[\w.-]+\.\w+|is called|jmenuje se/i.test(lower)) {
    return "entity";
  }
  if (/is|are|has|have|je|má|jsou/i.test(lower)) {
    return "fact";
  }
  return "other";
}
const memoryPlugin = { id: "memory-lancedb", name: "Memory (LanceDB)", description: "LanceDB-backed long-term memory with auto-recall/capture", kind: "memory", configSchema: memoryConfigSchema, register: function(api) {
  const cfg = memoryConfigSchema.parse(api.pluginConfig);
  const resolvedDbPath = api.resolvePath(cfg.dbPath);
  const vectorDim = vectorDimsForModel((cfg.embedding.model ?? "text-embedding-3-small"));
  const db = new MemoryDB(resolvedDbPath, vectorDim);
  const embeddings = new Embeddings(cfg.embedding.apiKey, cfg.embedding.model);
  api.logger.info("memory-lancedb: plugin registered (db: , lazy init)");
  api.registerTool({ name: "memory_recall", label: "Memory Recall", description: "Search through long-term memories. Use when you need context about user preferences, past decisions, or previously discussed topics.", parameters: Type.Object({ query: Type.String({ description: "Search query" }), limit: Type.Optional(Type.Number({ description: "Max results (default: 5)" })) }), execute: async function(_toolCallId, params) {
    const {query, limit = 5} = params;
    const vector = await embeddings.embed(query);
    const results = await db.search(vector, limit, 0.1);
    if ((results.length === 0)) {
      return { content: [{ type: "text", text: "No relevant memories found." }], details: { count: 0 } };
    }
    const text = results.map((r, i) => ". []  (%)").join("
");
    const sanitizedResults = results.map((r) => { id: r.entry.id, text: r.entry.text, category: r.entry.category, importance: r.entry.importance, score: r.score });
    return { content: [{ type: "text", text: "Found  memories:

" }], details: { count: results.length, memories: sanitizedResults } };
  } }, { name: "memory_recall" });
  api.registerTool({ name: "memory_store", label: "Memory Store", description: "Save important information in long-term memory. Use for preferences, facts, decisions.", parameters: Type.Object({ text: Type.String({ description: "Information to remember" }), importance: Type.Optional(Type.Number({ description: "Importance 0-1 (default: 0.7)" })), category: Type.Optional(stringEnum(MEMORY_CATEGORIES)) }), execute: async function(_toolCallId, params) {
    const {text, importance = 0.7, category = "other"} = params;
    const vector = await embeddings.embed(text);
    const existing = await db.search(vector, 1, 0.95);
    if ((existing.length > 0)) {
      return { content: [{ type: "text", text: "Similar memory already exists: \"\"" }], details: { action: "duplicate", existingId: existing[0].entry.id, existingText: existing[0].entry.text } };
    }
    const entry = await db.store({ text, vector, importance, category });
    return { content: [{ type: "text", text: "Stored: \"...\"" }], details: { action: "created", id: entry.id } };
  } }, { name: "memory_store" });
  api.registerTool({ name: "memory_forget", label: "Memory Forget", description: "Delete specific memories. GDPR-compliant.", parameters: Type.Object({ query: Type.Optional(Type.String({ description: "Search to find memory" })), memoryId: Type.Optional(Type.String({ description: "Specific memory ID" })) }), execute: async function(_toolCallId, params) {
    const {query, memoryId} = params;
    if (memoryId) {
      await db.delete(memoryId);
      return { content: [{ type: "text", text: "Memory  forgotten." }], details: { action: "deleted", id: memoryId } };
    }
    if (query) {
      const vector = await embeddings.embed(query);
      const results = await db.search(vector, 5, 0.7);
      if ((results.length === 0)) {
        return { content: [{ type: "text", text: "No matching memories found." }], details: { found: 0 } };
      }
      if (((results.length === 1) && (results[0].score > 0.9))) {
        await db.delete(results[0].entry.id);
        return { content: [{ type: "text", text: "Forgotten: \"\"" }], details: { action: "deleted", id: results[0].entry.id } };
      }
      const list = results.map((r) => "- [] ...").join("
");
      const sanitizedCandidates = results.map((r) => { id: r.entry.id, text: r.entry.text, category: r.entry.category, score: r.score });
      return { content: [{ type: "text", text: "Found  candidates. Specify memoryId:
" }], details: { action: "candidates", candidates: sanitizedCandidates } };
    }
    return { content: [{ type: "text", text: "Provide query or memoryId." }], details: { error: "missing_param" } };
  } }, { name: "memory_forget" });
  api.registerCli(({program}) => {
    const memory = program.command("ltm").description("LanceDB memory plugin commands");
    memory.command("list").description("List memories").action(async () => {
      const count = await db.count();
      console.log("Total memories: ");
    });
    memory.command("search").description("Search memories").argument("<query>", "Search query").option("--limit <n>", "Max results", "5").action(async (query, opts) => {
      const vector = await embeddings.embed(query);
      const results = await db.search(vector, parseInt(opts.limit), 0.3);
      const output = results.map((r) => { id: r.entry.id, text: r.entry.text, category: r.entry.category, importance: r.entry.importance, score: r.score });
      console.log(JSON.stringify(output, null, 2));
    });
    memory.command("stats").description("Show memory statistics").action(async () => {
      const count = await db.count();
      console.log("Total memories: ");
    });
  }, { commands: ["ltm"] });
  if (cfg.autoRecall) {
    api.on("before_agent_start", async (event) => {
      if ((!event.prompt || (event.prompt.length < 5))) {
        return;
      }
      try {
        {
          const vector = await embeddings.embed(event.prompt);
          const results = await db.search(vector, 3, 0.3);
          if ((results.length === 0)) {
            return;
          }
          const memoryContext = results.map((r) => "- [] ").join("
");
          api.logger.info?.("memory-lancedb: injecting  memories into context");
          return { prependContext: "<relevant-memories>
The following memories may be relevant to this conversation:

</relevant-memories>" };
        }
      }
      catch (err) {
        {
          api.logger.warn("memory-lancedb: recall failed: ");
        }
      }
    });
  }
  if (cfg.autoCapture) {
    api.on("agent_end", async (event) => {
      if (((!event.success || !event.messages) || (event.messages.length === 0))) {
        return;
      }
      try {
        {
          const texts = [];
          for (const msg of event.messages) {
            if ((!msg || (typeof msg !== "object"))) {
              continue;
            }
            const msgObj = msg;
            const role = msgObj.role;
            if (((role !== "user") && (role !== "assistant"))) {
              continue;
            }
            const content = msgObj.content;
            if ((typeof content === "string")) {
              texts.push(content);
              continue;
            }
            if (Array.isArray(content)) {
              for (const block of content) {
                if ((((((block && (typeof block === "object")) && ("type" in block)) && (block.type === "text")) && ("text" in block)) && (typeof block.text === "string"))) {
                  texts.push(block.text);
                }
              }
            }
          }
          const toCapture = texts.filter((text) => (text && shouldCapture(text)));
          if ((toCapture.length === 0)) {
            return;
          }
          let stored = 0;
          for (const text of toCapture.slice(0, 3)) {
            const category = detectCategory(text);
            const vector = await embeddings.embed(text);
            const existing = await db.search(vector, 1, 0.95);
            if ((existing.length > 0)) {
              continue;
            }
            await db.store({ text, vector, importance: 0.7, category });
            stored++;
          }
          if ((stored > 0)) {
            api.logger.info("memory-lancedb: auto-captured  memories");
          }
        }
      }
      catch (err) {
        {
          api.logger.warn("memory-lancedb: capture failed: ");
        }
      }
    });
  }
  api.registerService({ id: "memory-lancedb", start: () => {
    api.logger.info("memory-lancedb: initialized (db: , model: )");
  }, stop: () => {
    api.logger.info("memory-lancedb: stopped");
  } });
} };
