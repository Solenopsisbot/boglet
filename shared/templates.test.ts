import { describe, expect, it } from "vitest";
import { evalMutation, evalQuery, type RowOps, type RunCtx } from "./interpreter";
import { TEMPLATES } from "./templates";

function makeMemoryRows(): RowOps & { rows: Record<string, Array<Record<string, unknown>>> } {
  const rows: Record<string, Array<Record<string, unknown>>> = {};
  let next = 1;
  const ensure = (table: string) => rows[table] ?? (rows[table] = []);
  return {
    rows,
    query(table, opts) {
      let out = ensure(table).map((row) => ({ ...row }));
      for (const [field, op, value] of opts.where || []) {
        out = out.filter((row) => {
          const actual = row[field];
          switch (op) {
            case "==": return actual === value || String(actual) === String(value);
            case "!=": return !(actual === value || String(actual) === String(value));
            case "<": return (actual as number) < (value as number);
            case "<=": return (actual as number) <= (value as number);
            case ">": return (actual as number) > (value as number);
            case ">=": return (actual as number) >= (value as number);
          }
        });
      }
      if (opts.orderBy?.[0]) {
        const [field, dir] = opts.orderBy[0];
        out.sort((a, b) => {
          const av = a[field];
          const bv = b[field];
          if (av === bv) return 0;
          return av < bv ? (dir === "asc" ? -1 : 1) : (dir === "asc" ? 1 : -1);
        });
      }
      return opts.limit ? out.slice(0, opts.limit) : out;
    },
    get(table, rowKey) {
      return ensure(table).find((row) => row.id === rowKey) ?? null;
    },
    insert(table, data) {
      const id = "row_" + next++;
      ensure(table).push({ ...data, id, createdAt: new Date(next).toISOString() });
      return id;
    },
    update(table, rowKey, patch) {
      const found = ensure(table).find((row) => row.id === rowKey);
      if (!found) return false;
      Object.assign(found, patch);
      return true;
    },
    delete(table, rowKey) {
      const tableRows = ensure(table);
      const idx = tableRows.findIndex((row) => row.id === rowKey);
      if (idx === -1) return false;
      tableRows.splice(idx, 1);
      return true;
    },
  };
}

function makeCtx(db = makeMemoryRows(), args: unknown[] = []): RunCtx {
  return {
    auth: { userId: "user_1", userName: "Tester", isGuest: false },
    args: args as unknown as Record<string, unknown>,
    db,
    log: () => undefined,
  };
}

describe("templates", () => {
  it("all bundled templates validate through their queries", () => {
    for (const [name, manifest] of Object.entries(TEMPLATES)) {
      for (const [queryName, queryDef] of Object.entries(manifest.queries)) {
        expect(() => evalQuery(queryDef, makeCtx())).not.toThrow();
        expect(Array.isArray(evalQuery(queryDef, makeCtx()))).toBe(true);
      }
      expect(name).toBeTruthy();
    }
  });

  it("poll can seed options and record one vote", () => {
    const db = makeMemoryRows();
    const manifest = TEMPLATES.poll;
    evalMutation(manifest.mutations.initPoll, makeCtx(db));

    const options = evalQuery(manifest.queries.options, makeCtx(db));
    expect(options).toHaveLength(4);

    evalMutation(manifest.mutations.vote, makeCtx(db, [(options[0] as { id: string }).id]));
    expect(evalQuery(manifest.queries.myVote, makeCtx(db))).toHaveLength(1);
    expect((evalQuery(manifest.queries.poll, makeCtx(db))[0] as { totalVotes: number }).totalVotes).toBe(1);
  });

  it("habits exposes today's completion state without template-only fields", () => {
    const db = makeMemoryRows();
    const manifest = TEMPLATES.habits;
    evalMutation(manifest.mutations.addHabit, makeCtx(db, ["Read"]));
    const habit = evalQuery(manifest.queries.habits, makeCtx(db))[0] as { id: string; streak: number };

    evalMutation(manifest.mutations.toggle, makeCtx(db, [habit.id]));
    expect(evalQuery(manifest.queries.myHabitLogs, makeCtx(db))).toHaveLength(1);
    expect((evalQuery(manifest.queries.habits, makeCtx(db))[0] as { streak: number }).streak).toBe(1);

    evalMutation(manifest.mutations.toggle, makeCtx(db, [habit.id]));
    expect(evalQuery(manifest.queries.myHabitLogs, makeCtx(db))).toHaveLength(0);
    expect((evalQuery(manifest.queries.habits, makeCtx(db))[0] as { streak: number }).streak).toBe(0);
  });
});
