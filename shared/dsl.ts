// Boglet DSL — the JSON AST users write to define their cloud-deployed "capsules".
// All values are JSON-serializable so manifests round-trip cleanly through the db.

export type BinOp =
  | "+" | "-" | "*" | "/" | "%"
  | "==" | "!=" | "<" | "<=" | ">" | ">="
  | "&&" | "||"
  | "concat";

export type Expr =
  | { literal: string | number | boolean | null }
  | { var: string } // dot path: "ctx.userId", "args.text", "row.body"
  | { call: string; args: Expr[] } // builtin call
  | { op: BinOp; a: Expr; b: Expr }
  | { obj: Record<string, Expr> }
  | { arr: Expr[] };

export type Stmt =
  | { stmt: "let"; name: string; value: Expr }
  | { stmt: "if"; cond: Expr; then: Stmt[]; else?: Stmt[] }
  | { stmt: "for"; of: Expr; as: string; body: Stmt[] }
  | { stmt: "query"; name: string; from: string; where?: WhereCmp[]; orderBy?: OrderBy[]; limit?: number }
  | { stmt: "insert"; table: string; data: Expr }
  | { stmt: "update"; table: string; id: Expr; patch: Expr }
  | { stmt: "delete"; table: string; id: Expr }
  | { stmt: "log"; level?: "info" | "warn" | "error"; message: Expr }
  | { stmt: "return"; value: Expr };

export type CmpOp = "==" | "!=" | "<" | "<=" | ">" | ">=";

export type WhereCmp = [string, CmpOp, Expr];
export type WhereVal = [string, CmpOp, unknown];

export type OrderBy = [string, "asc" | "desc"];

export type FieldType = "string" | "boolean" | "number";

export type TableDef = {
  fields: Record<string, FieldType>;
};

export type QueryDef = {
  from: string;
  where?: WhereCmp[];
  orderBy?: OrderBy[];
  limit?: number;
};

export type MutationDef = {
  args: string[];
  body: Stmt[];
};

export type ScheduleDef = {
  name: string;
  // cron-like spec we evaluate ourselves: "*/5 * * * *" or one of:
  // "@minute", "@hour", "@day"
  spec: string;
  mutation: string;
  args?: unknown[];
};

export type Manifest = {
  name: string;
  description?: string;
  schema: { tables: Record<string, TableDef> };
  queries: Record<string, QueryDef>;
  mutations: Record<string, MutationDef>;
  pages: Record<string, string>; // path -> HTML body for the iframe
  schedules?: ScheduleDef[];
  webhooks?: { url: string; events: string[] }[];
};

// Minimum-viable manifest validation. Returns null + reason if bad.
export function validateManifest(value: unknown): { ok: true; manifest: Manifest } | { ok: false; reason: string } {
  if (!value || typeof value !== "object") return { ok: false, reason: "manifest must be an object" };
  const m = value as Partial<Manifest>;
  if (typeof m.name !== "string" || !m.name.trim()) return { ok: false, reason: "manifest.name required" };
  if (!m.schema || typeof m.schema !== "object" || !m.schema.tables) return { ok: false, reason: "manifest.schema.tables required" };
  if (!m.queries || typeof m.queries !== "object") return { ok: false, reason: "manifest.queries must be an object" };
  if (!m.mutations || typeof m.mutations !== "object") return { ok: false, reason: "manifest.mutations must be an object" };
  if (!m.pages || typeof m.pages !== "object") return { ok: false, reason: "manifest.pages must be an object" };
  return { ok: true, manifest: m as Manifest };
}
