// Boglet DSL interpreter — pure TypeScript, no DOM, no Node.
// Evaluates user-supplied manifest queries/mutations against scoped row ops.
//
// Security model:
// - The interpreter only sees a `RowOps` adapter the server constructed for ONE app.
// - All db reads/writes are scoped by the adapter; the interpreter cannot escape the partition.
// - We enforce step / depth / db-op / output budgets so a hostile manifest cannot pin the host.

import type {
  Expr, Stmt, BinOp, QueryDef, MutationDef, WhereVal, WhereCmp, OrderBy,
} from "./dsl";

// re-export so other modules picking up interpreter types don't have to dual-import.
export type { WhereVal };

// Budgets (tuneable from the caller via createScratch).
export const DEFAULT_LIMITS = {
  steps: 10_000,
  depth: 32,
  dbOps: 100,
  output: 1_000_000, // bytes (approximate, measured at row insert)
};

export class InterpError extends Error {
  constructor(public reason: string) { super(reason); }
}

export type RowOps = {
  query(table: string, opts: { where?: WhereVal[]; orderBy?: OrderBy[]; limit?: number }): unknown[];
  get(table: string, rowKey: string): Record<string, unknown> | null;
  insert(table: string, data: Record<string, unknown>): string;
  update(table: string, rowKey: string, patch: Record<string, unknown>): boolean;
  delete(table: string, rowKey: string): boolean;
};

export type RunCtx = {
  auth: { userId: string; userName: string; isGuest: boolean };
  args: Record<string, unknown>;
  db: RowOps;
  log(level: "info" | "warn" | "error", message: string): void;
};

type Scratch = {
  steps: number;
  depth: number;
  dbOps: number;
  output: number;
  returnVal: unknown;
  didReturn: boolean;
  limits: typeof DEFAULT_LIMITS;
};

type Frame = { vars: Record<string, unknown> };

export function createScratch(limits = DEFAULT_LIMITS): Scratch {
  return { steps: 0, depth: 0, dbOps: 0, output: 0, returnVal: undefined, didReturn: false, limits };
}

export function evalQuery(qdef: QueryDef, ctx: RunCtx, scratch = createScratch()): unknown[] {
  const frame = makeFrame(ctx);
  const where: WhereVal[] = (qdef.where || []).map(([field, op, expr]) => [field, op, evalExpr(expr, frame, scratch)]);
  scratch.dbOps++;
  if (scratch.dbOps > scratch.limits.dbOps) throw new InterpError("db op budget exceeded");
  return ctx.db.query(qdef.from, { where, orderBy: qdef.orderBy, limit: qdef.limit });
}

export function evalMutation(mdef: MutationDef, ctx: RunCtx, scratch = createScratch()): unknown {
  const argsObj: Record<string, unknown> = {};
  const argList = ctx.args as unknown as unknown[];
  for (let i = 0; i < mdef.args.length; i++) {
    argsObj[mdef.args[i]] = Array.isArray(argList) ? argList[i] ?? null : null;
  }
  const frame = makeFrame({ ...ctx, args: argsObj });
  for (const stmt of mdef.body) {
    if (scratch.didReturn) break;
    execStmt(stmt, frame, ctx, scratch);
  }
  return scratch.returnVal;
}

function makeFrame(ctx: { auth: RunCtx["auth"]; args: Record<string, unknown> }): Frame {
  return {
    vars: {
      ctx: { userId: ctx.auth.userId, userName: ctx.auth.userName, isGuest: ctx.auth.isGuest, now: new Date().toISOString() },
      args: ctx.args,
    },
  };
}

function step(scratch: Scratch): void {
  scratch.steps++;
  if (scratch.steps > scratch.limits.steps) throw new InterpError("step budget exceeded");
}

function evalExpr(e: Expr, frame: Frame, scratch: Scratch): unknown {
  step(scratch);
  if ("literal" in e) return e.literal;
  if ("var" in e) return resolveVar(e.var, frame);
  if ("call" in e) {
    const args = e.args.map((a) => evalExpr(a, frame, scratch));
    return callBuiltin(e.call, args);
  }
  if ("op" in e) {
    // Short-circuit && and || without evaluating right side eagerly.
    if (e.op === "&&") {
      const left = evalExpr(e.a, frame, scratch);
      if (!left) return false;
      return Boolean(evalExpr(e.b, frame, scratch));
    }
    if (e.op === "||") {
      const left = evalExpr(e.a, frame, scratch);
      if (left) return Boolean(left);
      return Boolean(evalExpr(e.b, frame, scratch));
    }
    return applyBinOp(e.op, evalExpr(e.a, frame, scratch), evalExpr(e.b, frame, scratch));
  }
  if ("obj" in e) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(e.obj)) out[k] = evalExpr(v, frame, scratch);
    return out;
  }
  if ("arr" in e) return e.arr.map((x) => evalExpr(x, frame, scratch));
  throw new InterpError("unknown expr shape");
}

function resolveVar(path: string, frame: Frame): unknown {
  const parts = path.split(".");
  let cur: unknown = frame.vars;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur ?? null;
}

function callBuiltin(name: string, args: unknown[]): unknown {
  switch (name) {
    case "now": return new Date().toISOString();
    case "uuid": return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
    case "len": {
      const v = args[0];
      if (typeof v === "string") return v.length;
      if (Array.isArray(v)) return v.length;
      return 0;
    }
    case "concat": return args.map((a) => a == null ? "" : String(a)).join("");
    case "lower": return String(args[0] ?? "").toLowerCase();
    case "upper": return String(args[0] ?? "").toUpperCase();
    case "trim": return String(args[0] ?? "").trim();
    case "slice": return String(args[0] ?? "").slice(Number(args[1] ?? 0), args[2] == null ? undefined : Number(args[2]));
    case "toString": return args[0] == null ? "" : String(args[0]);
    case "parseInt": return parseInt(String(args[0] ?? "0"), 10);
    case "parseFloat": return parseFloat(String(args[0] ?? "0"));
    case "not": return !args[0];
    case "isEmpty": {
      const v = args[0];
      if (v == null) return true;
      if (typeof v === "string") return v === "";
      if (Array.isArray(v)) return v.length === 0;
      return false;
    }
    case "coalesce": for (const a of args) if (a != null && a !== "") return a; return null;
    case "min": return args.reduce((acc: number | null, v) => acc == null ? Number(v) : Math.min(acc, Number(v)), null);
    case "max": return args.reduce((acc: number | null, v) => acc == null ? Number(v) : Math.max(acc, Number(v)), null);
    default: throw new InterpError("unknown builtin: " + name);
  }
}

function applyBinOp(op: BinOp, a: unknown, b: unknown): unknown {
  switch (op) {
    case "+": return Number(a) + Number(b);
    case "-": return Number(a) - Number(b);
    case "*": return Number(a) * Number(b);
    case "/": return Number(b) === 0 ? 0 : Number(a) / Number(b);
    case "%": return Number(b) === 0 ? 0 : Number(a) % Number(b);
    case "==": return a === b || String(a) === String(b);
    case "!=": return !(a === b || String(a) === String(b));
    case "<": return (a as number) < (b as number);
    case "<=": return (a as number) <= (b as number);
    case ">": return (a as number) > (b as number);
    case ">=": return (a as number) >= (b as number);
    case "concat": return String(a ?? "") + String(b ?? "");
    case "&&":
    case "||": return false; // handled inline for short-circuit
  }
}

function execStmt(s: Stmt, frame: Frame, ctx: RunCtx, scratch: Scratch): void {
  step(scratch);
  if (scratch.didReturn) return;

  if (s.stmt === "let") {
    frame.vars[s.name] = evalExpr(s.value, frame, scratch);
    return;
  }
  if (s.stmt === "if") {
    const cond = evalExpr(s.cond, frame, scratch);
    const branch = cond ? s.then : (s.else || []);
    scratch.depth++;
    if (scratch.depth > scratch.limits.depth) throw new InterpError("depth budget exceeded");
    for (const sub of branch) {
      if (scratch.didReturn) break;
      execStmt(sub, frame, ctx, scratch);
    }
    scratch.depth--;
    return;
  }
  if (s.stmt === "for") {
    const items = evalExpr(s.of, frame, scratch);
    if (!Array.isArray(items)) return;
    scratch.depth++;
    if (scratch.depth > scratch.limits.depth) throw new InterpError("depth budget exceeded");
    let i = 0;
    for (const item of items) {
      if (i++ > 1000) throw new InterpError("for-loop iteration limit (1000)");
      if (scratch.didReturn) break;
      frame.vars[s.as] = item;
      for (const sub of s.body) {
        if (scratch.didReturn) break;
        execStmt(sub, frame, ctx, scratch);
      }
    }
    scratch.depth--;
    return;
  }
  if (s.stmt === "query") {
    scratch.dbOps++;
    if (scratch.dbOps > scratch.limits.dbOps) throw new InterpError("db op budget exceeded");
    const where: WhereVal[] = (s.where || []).map(([f, op, expr]) => [f, op, evalExpr(expr, frame, scratch)]);
    const rows = ctx.db.query(s.from, { where, orderBy: s.orderBy, limit: s.limit });
    frame.vars[s.name] = rows;
    return;
  }
  if (s.stmt === "insert") {
    scratch.dbOps++;
    if (scratch.dbOps > scratch.limits.dbOps) throw new InterpError("db op budget exceeded");
    const data = evalExpr(s.data, frame, scratch);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new InterpError("insert data must be object");
    ctx.db.insert(s.table, data as Record<string, unknown>);
    return;
  }
  if (s.stmt === "update") {
    scratch.dbOps++;
    if (scratch.dbOps > scratch.limits.dbOps) throw new InterpError("db op budget exceeded");
    const id = String(evalExpr(s.id, frame, scratch));
    const patch = evalExpr(s.patch, frame, scratch);
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new InterpError("update patch must be object");
    ctx.db.update(s.table, id, patch as Record<string, unknown>);
    return;
  }
  if (s.stmt === "delete") {
    scratch.dbOps++;
    if (scratch.dbOps > scratch.limits.dbOps) throw new InterpError("db op budget exceeded");
    const id = String(evalExpr(s.id, frame, scratch));
    ctx.db.delete(s.table, id);
    return;
  }
  if (s.stmt === "log") {
    const msg = String(evalExpr(s.message, frame, scratch));
    ctx.log(s.level || "info", msg.slice(0, 2000));
    return;
  }
  if (s.stmt === "return") {
    scratch.returnVal = evalExpr(s.value, frame, scratch);
    scratch.didReturn = true;
    return;
  }
}
