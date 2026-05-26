import type { Expr, Manifest, MutationDef, QueryDef, Stmt, TableDef } from "./dsl";

type ScriptResult = { ok: true; manifest: Manifest } | { ok: false; error: string };

function quote(s: string): string {
  return JSON.stringify(s);
}

function exprToScript(expr: Expr): string {
  if ("literal" in expr) return JSON.stringify(expr.literal);
  if ("var" in expr) return "$" + expr.var;
  if ("call" in expr) return expr.call + "(" + expr.args.map(exprToScript).join(", ") + ")";
  return JSON.stringify(expr);
}

function stmtToScript(stmt: Stmt): string {
  if (stmt.stmt === "insert") return "insert " + stmt.table + " " + exprToScript(stmt.data);
  if (stmt.stmt === "update") return "update " + stmt.table + " " + exprToScript(stmt.id) + " " + exprToScript(stmt.patch);
  if (stmt.stmt === "delete") return "delete " + stmt.table + " " + exprToScript(stmt.id);
  if (stmt.stmt === "log") return "log " + quote(stmt.level || "info") + " " + exprToScript(stmt.message);
  if (stmt.stmt === "return") return "return " + exprToScript(stmt.value);
  return "json " + JSON.stringify(stmt);
}

export function manifestToBogScript(manifest: Manifest): string {
  const lines: string[] = [
    "app " + quote(manifest.name),
  ];
  if (manifest.description) lines.push("description " + quote(manifest.description));
  lines.push("");
  for (const [name, table] of Object.entries(manifest.schema.tables)) {
    const fields = Object.entries(table.fields).map(([field, type]) => field + ":" + type).join(" ");
    lines.push("table " + name + (fields ? " " + fields : ""));
  }
  lines.push("");
  for (const [name, query] of Object.entries(manifest.queries)) {
    const parts = ["query", name, "from", query.from];
    if (query.where) parts.push("where", JSON.stringify(query.where));
    if (query.orderBy?.[0]) parts.push("order", query.orderBy[0][0], query.orderBy[0][1]);
    if (query.limit) parts.push("limit", String(query.limit));
    lines.push(parts.join(" "));
  }
  lines.push("");
  for (const [name, mutation] of Object.entries(manifest.mutations)) {
    lines.push("mutation " + name + "(" + mutation.args.join(", ") + ")");
    for (const stmt of mutation.body) lines.push("  " + stmtToScript(stmt));
    lines.push("end");
    lines.push("");
  }
  lines.push("# Page HTML lives in pages/*.html files. The script keeps schema, queries, and mutations readable.");
  return lines.join("\n").trim() + "\n";
}

function parseQuoted(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (s.startsWith("\"")) return JSON.parse(s);
  return s;
}

function parseValue(raw: string): Expr {
  const s = raw.trim();
  if (s.startsWith("$")) return { var: s.slice(1) };
  if (s === "true") return { literal: true };
  if (s === "false") return { literal: false };
  if (s === "null") return { literal: null };
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return { literal: Number(s) };
  if (s.startsWith("\"")) return { literal: JSON.parse(s) };
  const call = /^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/.exec(s);
  if (call) {
    const args = call[2].trim() ? call[2].split(",").map((part) => parseValue(part.trim())) : [];
    return { call: call[1], args };
  }
  return { literal: s };
}

function parseJsonExpr(raw: string): Expr {
  const value = JSON.parse(raw);
  return convertJsonExpr(value);
}

function convertJsonExpr(value: unknown): Expr {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (typeof record.var === "string") return { var: record.var };
    if ("literal" in record) return { literal: record.literal as string | number | boolean | null };
    if (typeof record.call === "string" && Array.isArray(record.args)) return { call: record.call, args: record.args.map(convertJsonExpr) };
    if (typeof record.op === "string" && record.a !== undefined && record.b !== undefined) return record as Expr;
    if (record.obj && typeof record.obj === "object") return record as Expr;
    const obj: Record<string, Expr> = {};
    for (const [k, v] of Object.entries(record)) obj[k] = convertJsonExpr(v);
    return { obj };
  }
  if (Array.isArray(value)) return { arr: value.map(convertJsonExpr) };
  return { literal: value as string | number | boolean | null };
}

function parseStmt(line: string): Stmt {
  if (line.startsWith("insert ")) {
    const match = /^insert\s+([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/.exec(line);
    if (!match) throw new Error("Bad insert statement.");
    return { stmt: "insert", table: match[1], data: parseJsonExpr(match[2]) };
  }
  if (line.startsWith("update ")) {
    const match = /^update\s+([A-Za-z_][A-Za-z0-9_]*)\s+(\S+)\s+(.+)$/.exec(line);
    if (!match) throw new Error("Bad update statement.");
    return { stmt: "update", table: match[1], id: parseValue(match[2]), patch: parseJsonExpr(match[3]) };
  }
  if (line.startsWith("delete ")) {
    const match = /^delete\s+([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/.exec(line);
    if (!match) throw new Error("Bad delete statement.");
    return { stmt: "delete", table: match[1], id: parseValue(match[2]) };
  }
  if (line.startsWith("return ")) return { stmt: "return", value: parseValue(line.slice(7)) };
  if (line.startsWith("log ")) {
    const match = /^log\s+("info"|"warn"|"error")\s+(.+)$/.exec(line);
    if (!match) throw new Error("Bad log statement.");
    return { stmt: "log", level: JSON.parse(match[1]), message: parseValue(match[2]) };
  }
  if (line.startsWith("json ")) return JSON.parse(line.slice(5)) as Stmt;
  throw new Error("Unknown statement: " + line);
}

export function bogScriptToManifest(script: string, existingPages: Record<string, string> = { "/": "<html><body><h1>Hello</h1></body></html>" }): ScriptResult {
  try {
    const manifest: Manifest = {
      name: "untitled",
      description: "",
      schema: { tables: {} },
      queries: {},
      mutations: {},
      pages: { ...existingPages },
    };
    const lines = script.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("app ")) {
        manifest.name = parseQuoted(line.slice(4));
      } else if (line.startsWith("description ")) {
        manifest.description = parseQuoted(line.slice(12));
      } else if (line.startsWith("table ")) {
        const parts = line.split(/\s+/);
        const tableName = parts[1];
        const fields: TableDef["fields"] = {};
        for (const part of parts.slice(2)) {
          const [field, type] = part.split(":");
          if (field && (type === "string" || type === "number" || type === "boolean")) fields[field] = type;
        }
        manifest.schema.tables[tableName] = { fields };
      } else if (line.startsWith("query ")) {
        const parts = line.split(/\s+/);
        const name = parts[1];
        const fromIdx = parts.indexOf("from");
        if (fromIdx === -1 || !parts[fromIdx + 1]) throw new Error("Query " + name + " needs from <table>.");
        const q: QueryDef = { from: parts[fromIdx + 1] };
        const whereIdx = parts.indexOf("where");
        const orderIdx = parts.indexOf("order");
        const limitIdx = parts.indexOf("limit");
        if (whereIdx !== -1) {
          const end = [orderIdx, limitIdx].filter((idx) => idx > whereIdx).sort((a, b) => a - b)[0] ?? parts.length;
          q.where = JSON.parse(parts.slice(whereIdx + 1, end).join(" "));
        }
        if (orderIdx !== -1 && parts[orderIdx + 1]) q.orderBy = [[parts[orderIdx + 1], parts[orderIdx + 2] === "asc" ? "asc" : "desc"]];
        if (limitIdx !== -1) q.limit = Number(parts[limitIdx + 1] || 0) || undefined;
        manifest.queries[name] = q;
      } else if (line.startsWith("mutation ")) {
        const match = /^mutation\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)$/.exec(line);
        if (!match) throw new Error("Bad mutation header.");
        const body: Stmt[] = [];
        for (i = i + 1; i < lines.length; i++) {
          const inner = lines[i].trim();
          if (!inner || inner.startsWith("#")) continue;
          if (inner === "end") break;
          body.push(parseStmt(inner));
        }
        const args = match[2].trim() ? match[2].split(",").map((arg) => arg.trim()).filter(Boolean) : [];
        manifest.mutations[match[1]] = { args, body: body as MutationDef["body"] };
      } else {
        throw new Error("Unknown directive: " + line);
      }
    }
    return { ok: true, manifest };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unable to parse Boglet script." };
  }
}
