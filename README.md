# Boglet

A tiny PaaS that lives inside one [Lakebed](https://lakebed.dev/) capsule.

Sign in with Google, author a capsule as a JSON manifest (schema + queries + mutations + HTML pages), deploy it. Visitors run it through a sandboxed iframe with a `postMessage` bridge to a budget-bounded interpreter. That's the whole thing.

## What's actually here

- **Manifests are JSON.** No bundler, no npm install, no compile step. Capsules are typed AST documents that round-trip through the database.
- **Sandboxed iframe runner.** User pages render in `<iframe sandbox="allow-scripts">` with a small `window.boglet` helper exposing `query()`, `mutation()`, `auth()`, `onReady()`.
- **Partition-scoped data.** Every row in your capsule lives at `appTable = "{appId}__{tableName}"`. The interpreter cannot escape the partition.
- **Budgeted interpreter** (pure TS in `shared/interpreter.ts`): 10k steps, depth 32, 100 db ops per call, 100KB per row.
- **Logs · metrics · env vault** per app. Every dispatch is logged, counted, bucketed. Env vars stored with at-rest XOR obfuscation.
- **Deploy history + rollback.** Every deploy is a versioned manifest. One click rolls back.
- **Scheduled jobs.** `@minute / @hour / @day / every Nm/s/h/d` cron-style specs. Fired by the dashboard pulse.

## Repository layout

```
boglet/
├── server/index.ts        # schema (9 tables) + interpreter glue + ~17 handlers
├── client/index.tsx       # one Preact SPA: landing, docs, status, dashboard, runner, editor
└── shared/
    ├── dsl.ts             # the manifest AST
    ├── interpreter.ts     # pure-TS evaluator
    ├── templates.ts       # todo · guestbook · counter · boglet (recursive demo) · empty
    └── format.ts          # slug, time-ago, obfuscation helpers
```

One Lakebed capsule. No other dependencies. No `package.json`.

## Running locally

```sh
npx lakebed dev
# http://localhost:3000
```

The first time someone loads the page, `seedSystemApps` runs idempotently and creates the recursive `boglet` app at `#/app/boglet` under a synthetic `system` user.

## Deploying

```sh
npx lakebed deploy    # anonymous deploy — gives a temp URL
npx lakebed claim     # if you want hosted env or outbound fetch
npx lakebed deploy    # again, claimed this time
```

## DSL quick reference

Expressions:

```json
{ "literal": "hello" }
{ "var": "ctx.userId" }                        // dot-path into ctx, args, or any let-bound name
{ "call": "now", "args": [] }                  // builtins: now, uuid, len, concat, lower, upper, trim, slice, toString, parseInt, parseFloat, not, isEmpty, coalesce, min, max
{ "op": "+", "a": ..., "b": ... }              // op: + - * / % == != < <= > >= && || concat
{ "obj": { "k": expr } }
{ "arr": [ expr ] }
```

Statements:

```json
{ "stmt": "let", "name": "x", "value": expr }
{ "stmt": "if", "cond": expr, "then": [...], "else": [...] }
{ "stmt": "for", "of": expr, "as": "row", "body": [...] }
{ "stmt": "query", "name": "rows", "from": "todos", "where": [...], "orderBy": [...], "limit": N }
{ "stmt": "insert", "table": "todos", "data": objExpr }
{ "stmt": "update", "table": "todos", "id": expr, "patch": objExpr }
{ "stmt": "delete", "table": "todos", "id": expr }
{ "stmt": "log", "message": expr }
{ "stmt": "return", "value": expr }
```

## License

MIT.
