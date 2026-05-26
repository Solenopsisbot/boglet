# Boglet [alpha]

> Let the agents build. Get out of their way.

Boglet is the agent-native cloud platform for the post-IDE era. Deploy capsules with a single command. Scale to zero between requests. Pay only for what your agents ship.

Boglet runs on Boglet.

(Specifically: Boglet is one Lakebed capsule that pretends to be a cloud platform. Users sign up, "deploy capsules" — really JSON manifests describing schema, queries, mutations, and HTML pages — and visitors run those capsules through an iframe + postMessage bridge. The platform's own landing page is, at one level removed, served as a Boglet app deployed on Boglet. It's bits all the way down.)

## What's in this repo

```
boglet/
├── server/index.ts          # schema (9 tables), interpreter glue, all handlers
├── client/index.tsx         # one Preact SPA: landing, docs, dashboard, runner, editor
├── shared/
│   ├── dsl.ts               # the manifest AST (JSON-serializable)
│   ├── interpreter.ts       # pure-TS evaluator for query/mutation defs
│   ├── templates.ts         # todo / guestbook / counter / boglet / empty
│   └── format.ts            # slug helpers, time ago, obfuscation for env vault
└── README.md
```

One Lakebed capsule. No other dependencies. No bundler config. No `package.json`.

## Architecture

- **Multi-tenant via partition key**: every user-data row lives in the shared `rows` table, keyed by `appTable = "{appId}__{tableName}"`. The interpreter cannot escape the partition.
- **Manifests are JSON**: schema, queries, mutations, pages — all data. No user JS is ever evaluated by `eval`/`Function`.
- **Interpreter is pure-TS**: walks the AST, scoped row ops, step/depth/db-op budgets. Lives in `shared/interpreter.ts`.
- **Iframe + postMessage bridge**: user pages render in `<iframe sandbox="allow-scripts">` with a tiny `window.boglet` helper that round-trips RPC through `parent.postMessage` → `useMutation("runUserCall")` → interpreter → result.
- **Hash routing**: Lakebed only serves `/` — so the SPA uses `#/dashboard`, `#/app/foo`, etc.
- **Single dispatch entrypoint**: both user queries and user mutations route through `runUserCall(slug, name, args)` because Lakebed's `useQuery` doesn't take dynamic args at call time.

## Running locally

```sh
npx lakebed dev
# open http://localhost:3000
```

The first time someone visits `#/`, the client fires `seedSystemApps` which idempotently creates the recursive `boglet` app at `#/app/boglet`. Owner of that synthetic app is `"system"`.

## Deploying

```sh
# Anonymous (no Google env, no outbound fetch — fine for the demo):
npx lakebed deploy

# To get a real subdomain (and outbound fetch for webhooks):
npx lakebed claim
npx lakebed deploy
npx lakebed domains add boglet.lakebed.app
```

## The bit

The funnier you keep it, the harder it lands. Lean into the straight-faced enterprise voice in the marketing pages — that's the joke. The pages are real Preact components rendering a real (tiny, but real) PaaS that lives in one capsule on Lakebed.

## What's not in v1

- Per-app fingerprints, IP allow-list, custom regions (currently `pickRegion` is deterministic hash)
- Real webhooks (requires claimed deploy + outbound fetch)
- Structured manifest editor (current editor is JSON textarea + lint button)
- Full cron parser (currently supports `@minute`, `@hour`, `@day`, `every Nm/s/h/d`)
- Aggregate queries (count/sum/avg) in the DSL

Built with maximum sincerity.
