// Boglet — single Preact client entry. Pathname-based routing, no react-router.
// The whole "cloud platform" (landing, docs, pricing, status, dashboard, app runner)
// lives inside this one file because Lakebed only allows one client entry.

import { SignInWithGoogle, signOut, useAuth, useMutation, useQuery } from "lakebed/client";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { TEMPLATES, TEMPLATE_LABELS, type TemplateKind } from "../shared/templates";
import { formatTimeAgo, isValidSlug, slugify } from "../shared/format";
import type { Manifest } from "../shared/dsl";

// ---------- Fetcher hook ----------
//
// Lakebed's useQuery<T>(name) takes no args, so for any parameterized read we
// call a mutation (which DOES take args) wrapped in this hook. Returns:
//   data: undefined while loading, null on error, T on success
//   refresh: call to re-fetch
//
// `deps` controls when the fetcher re-runs. Pass anything that, when changed,
// should trigger a refetch (e.g. the slug, the appId).

function useFetched<T>(fetcher: () => Promise<T>, deps: unknown[]): [T | null | undefined, () => void] {
  const [data, setData] = useState<T | null | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  useEffect(() => {
    let cancelled = false;
    fetcherRef.current()
      .then((v) => { if (!cancelled) setData(v); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);
  return [data, () => setRefreshKey((k) => k + 1)];
}

// ---------- Tiny hash-based router ----------
//
// Lakebed only serves `/` — every other path returns 404. So we use hash-based
// routing: paths like `#/dashboard`, `#/app/foo` keep us at `/` server-side
// while the client SPA renders the right view. Sharable URLs work, deep links
// work, refreshing works.

function currentRoute(): string {
  if (typeof window === "undefined") return "/";
  const h = window.location.hash;
  if (!h || h === "#") return "/";
  return h.startsWith("#") ? h.slice(1) : h;
}

function usePath(): [string, (next: string) => void] {
  const [path, setPath] = useState<string>(currentRoute());
  useEffect(() => {
    const onHash = () => setPath(currentRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (next: string) => {
    if (typeof window === "undefined") return;
    const target = next.startsWith("/") ? next : "/" + next;
    if (target === currentRoute()) return;
    window.location.hash = "#" + target;
    window.scrollTo(0, 0);
  };
  return [path, navigate];
}

function Link({ href, className, children, onClick }: { href: string; className?: string; children: unknown; onClick?: () => void }) {
  const hashHref = href.startsWith("http") || href.startsWith("mailto:") ? href : "#" + href;
  return (
    <a
      href={hashHref}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        // For external links, do nothing — let the browser navigate.
        if (href.startsWith("http") || href.startsWith("mailto:")) return;
        e.preventDefault();
        window.location.hash = "#" + href;
        if (onClick) onClick();
      }}
    >
      {children as preact.ComponentChildren}
    </a>
  );
}

// ---------- Top-level App router ----------

export function App() {
  const [path] = usePath();

  // Boglet is rendered as a Boglet app at /app/boglet. Seed it idempotently on first load.
  const seedSystemApps = useMutation<[], unknown>("seedSystemApps");
  useEffect(() => { void seedSystemApps(); /* fire-and-forget; idempotent */ }, []);

  if (path === "/") return <Landing />;
  if (path === "/docs") return <Docs />;
  if (path === "/pricing") return <Pricing />;
  if (path === "/status") return <StatusPage />;
  if (path === "/built-on-boglet") return <BuiltOnBoglet />;
  if (path === "/dashboard") return <Dashboard />;
  if (path === "/dashboard/new") return <NewAppWizard />;

  const editMatch = path.match(/^\/dashboard\/apps\/([a-z0-9-]+)\/edit$/);
  if (editMatch) return <ManifestEditor slug={editMatch[1]} />;

  const detailMatch = path.match(/^\/dashboard\/apps\/([a-z0-9-]+)$/);
  if (detailMatch) return <AppDetail slug={detailMatch[1]} />;

  const runnerMatch = path.match(/^\/app\/([a-z0-9-]+)(\/.*)?$/);
  if (runnerMatch) return <Runner slug={runnerMatch[1]} subPath={runnerMatch[2] || "/"} />;

  return <NotFound />;
}

// ---------- Shared chrome ----------

function Nav() {
  const auth = useAuth();
  return (
    <header className="border-b border-neutral-900 bg-black">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2 text-white">
          <span className="text-lg font-bold tracking-tight">Boglet</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">[alpha]</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-neutral-400">
          <Link href="/docs" className="hover:text-white">Docs</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/status" className="hover:text-white">Status</Link>
          <a href="https://lakebed.dev/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Built on Lakebed ↗</a>
          {auth.isLoading ? null : auth.isGuest ? (
            <SignInWithGoogle className="border border-neutral-700 px-3 py-1.5 text-xs font-medium text-white hover:border-white" />
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-white">Dashboard →</Link>
              <button type="button" onClick={() => signOut()} className="text-xs text-neutral-500 hover:text-white">Sign out</button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-32 border-t border-neutral-900">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-12 px-6 py-12 text-sm text-neutral-500 md:grid-cols-4">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white">Product</p>
          <ul className="space-y-2">
            <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
            <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
            <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white">Platform</p>
          <ul className="space-y-2">
            <li><Link href="/status" className="hover:text-white">Status</Link></li>
            <li><span>Edge Regions: 5</span></li>
            <li><span>Uptime SLA: 99.999%</span></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white">Solutions</p>
          <ul className="space-y-2">
            <li><span>Boglet for Banking</span></li>
            <li><span>Boglet for Healthcare</span></li>
            <li><span>Boglet for Defense</span></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white">Compliance</p>
          <ul className="space-y-2">
            <li><span>SOC 2 Type II</span></li>
            <li><span>ISO 27001</span></li>
            <li><span>HIPAA · GDPR · CCPA</span></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between border-t border-neutral-900 px-6 py-6 text-xs text-neutral-600">
        <span>© Boglet, Inc. All rights reserved.</span>
        <Link href="/built-on-boglet" className="hover:text-white">Built on Boglet ↗</Link>
      </div>
    </footer>
  );
}

// ---------- Landing ----------

function Landing() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main>
        {/* Hero */}
        <section className="border-b border-neutral-900">
          <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
            <p className="mb-6 inline-block border border-neutral-800 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
              Boglet [alpha] · now generally available
            </p>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Let the agents build.<br />Get out of their way.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-neutral-400">
              Boglet is the agent-native cloud platform for the post-IDE era. Deploy capsules with a single command. Scale to zero between requests. Pay only for what your agents ship.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/dashboard" className="border border-white bg-white px-5 py-3 text-sm font-medium text-black hover:bg-neutral-200">
                Deploy your first capsule →
              </Link>
              <Link href="/docs" className="border border-neutral-700 px-5 py-3 text-sm font-medium text-white hover:border-white">
                Read the docs
              </Link>
              <code className="hidden font-mono text-sm text-neutral-500 md:inline">npx boglet new my-app</code>
            </div>
          </div>
        </section>

        {/* Trusted by */}
        <section className="border-b border-neutral-900">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <p className="text-center text-xs uppercase tracking-wider text-neutral-500">Trusted by capsule-shipping teams at</p>
            <div className="mt-6 grid grid-cols-2 items-center justify-items-center gap-8 text-neutral-400 md:grid-cols-6">
              {["MERIDIAN", "Vertex Labs", "NORTHWIND", "Foxglove AI", "PRIMUS", "Halcyon"].map((b) => (
                <span key={b} className="font-mono text-sm tracking-wider">{b}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-neutral-900">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
              The platform your agents already understand.
            </h2>
            <div className="mt-16 grid gap-12 md:grid-cols-3">
              {[
                ["Auto-scaling capsules", "Zero-config horizontal scaling. Boglet provisions runtime capacity in 41ms cold starts across 5 global regions. Your capsule wakes when the request arrives and sleeps when it doesn't."],
                ["Server-authoritative data", "Every query and mutation runs in our hardened source-IR runtime. Authorization is enforced at the partition level. No accidental cross-tenant leaks. No SQL injection. No surprises."],
                ["Built-in auth, free", "Google sign-in out of the box. Per-app identity. Per-user data scoping via ctx.userId. Stop building login pages and start shipping capsules."],
                ["Edge-routed traffic", "Requests terminate at the nearest of our 5 regional edges (US-East, US-West, EU-West, AP-Southeast, AP-Northeast) and route to the warmest replica. Median latency: 38ms."],
                ["Live observability", "Structured logs, per-app metrics, deploy history, point-in-time rollback. Every byte of state addressable, queryable, and auditable from your dashboard."],
                ["Secrets vault", "Per-app environment isolation with at-rest obfuscation. Never expose a secret to client code. Never embed a key in an artifact."],
              ].map(([title, body]) => (
                <div key={title}>
                  <h3 className="mb-3 text-base font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Code sample */}
        <section className="border-b border-neutral-900 bg-neutral-950">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">A capsule is JSON.</h2>
            <p className="mb-8 max-w-2xl text-neutral-400">No frameworks. No bundlers. No build step. Just write the manifest and deploy.</p>
            <pre className="overflow-x-auto border border-neutral-800 bg-black p-6 font-mono text-xs leading-relaxed text-neutral-300">
{`{
  "name": "todo",
  "schema": { "tables": { "todos": { "fields": { "text": "string", "done": "boolean", "ownerId": "string" }}}},
  "queries": {
    "todos": { "from": "todos", "where": [["ownerId","==", {"var":"ctx.userId"}]], "orderBy":[["createdAt","desc"]] }
  },
  "mutations": {
    "addTodo": {
      "args": ["text"],
      "body": [
        { "stmt": "insert", "table": "todos", "data": { "obj": {
          "text": { "var": "args.text" }, "done": { "literal": false }, "ownerId": { "var": "ctx.userId" }
        }}}
      ]
    }
  }
}`}
            </pre>
          </div>
        </section>

        {/* Testimonial */}
        <section className="border-b border-neutral-900">
          <div className="mx-auto max-w-3xl px-6 py-24 text-center">
            <blockquote className="text-2xl font-medium leading-relaxed text-white md:text-3xl">
              "We replaced our entire Kubernetes platform with Boglet on a Friday afternoon. Our agents are 8x more productive. I have stopped reading Hacker News."
            </blockquote>
            <p className="mt-6 text-sm text-neutral-500">— Eliana Vance, Chief Capsule Officer, Meridian</p>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="mx-auto max-w-3xl px-6 py-24 text-center">
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Your agents are ready.</h2>
            <p className="mt-4 text-neutral-400">Deploy your first capsule in under 41 seconds.</p>
            <div className="mt-8">
              <Link href="/dashboard" className="inline-block border border-white bg-white px-6 py-3 text-sm font-medium text-black hover:bg-neutral-200">
                Get started →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// ---------- Docs (fake but functional) ----------

function Docs() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-5xl font-bold tracking-tight">Boglet Docs</h1>
        <p className="mb-12 text-neutral-400">Boglet is an agent-native CLI and runtime for building small full-stack apps called capsules.</p>

        <h2 className="mb-4 mt-12 border-t border-neutral-900 pt-8 text-2xl font-semibold">Start Here</h2>
        <p className="mb-4 text-neutral-300">Create and run a capsule:</p>
        <pre className="mb-6 border border-neutral-800 bg-neutral-950 p-4 font-mono text-sm text-neutral-300">{`npx boglet new my-app --template todo
cd my-app
npx boglet dev`}</pre>
        <p className="text-neutral-400">A Boglet capsule is a JSON manifest with four sections: <code className="font-mono text-orange-400">schema</code>, <code className="font-mono text-orange-400">queries</code>, <code className="font-mono text-orange-400">mutations</code>, and <code className="font-mono text-orange-400">pages</code>.</p>

        <h2 className="mb-4 mt-12 border-t border-neutral-900 pt-8 text-2xl font-semibold">Server Contract</h2>
        <p className="text-neutral-300">Every capsule exports a manifest. The manifest describes a typed database, a set of named queries and mutations, and one or more HTML pages served from server state.</p>

        <h2 className="mb-4 mt-12 border-t border-neutral-900 pt-8 text-2xl font-semibold">Client Contract</h2>
        <p className="text-neutral-300">Pages run in an isolated sandbox with a <code className="font-mono text-orange-400">window.boglet</code> bridge that exposes <code className="font-mono text-orange-400">.query()</code>, <code className="font-mono text-orange-400">.mutation()</code>, <code className="font-mono text-orange-400">.auth()</code>, and <code className="font-mono text-orange-400">.onReady()</code>.</p>

        <h2 className="mb-4 mt-12 border-t border-neutral-900 pt-8 text-2xl font-semibold">Current Limits</h2>
        <ul className="list-disc pl-6 text-neutral-400">
          <li>One manifest per capsule.</li>
          <li>String and boolean fields. Numbers stored as JSON in row data.</li>
          <li>10,000 interpreter steps per query/mutation.</li>
          <li>100 db ops per mutation.</li>
          <li>100KB per row.</li>
          <li>Anonymous deploys do not have outbound fetch.</li>
        </ul>

        <p className="mt-16 text-sm text-neutral-500">Need more? <a href="mailto:enterprise@boglet.example" className="text-orange-400 hover:underline">Contact our enterprise team</a>.</p>
      </main>
      <Footer />
    </div>
  );
}

// ---------- Pricing ----------

function Pricing() {
  const tiers = [
    { name: "Hobby", price: "Free", caption: "for solo agents", features: ["3 capsules", "1GB of state", "Community support", "boglet.app subdomain"] },
    { name: "Pro", price: "$0.04/req", caption: "for shipping agents", features: ["Unlimited capsules", "100GB of state", "Email support", "Custom subdomains", "Deploy history"] },
    { name: "Enterprise", price: "Custom", caption: "for agent fleets", features: ["Dedicated regions", "SOC 2 Type II audit pack", "24/7 pager", "SSO", "On-prem option"] },
  ];
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="mb-2 text-5xl font-bold tracking-tight">Pricing</h1>
        <p className="mb-16 text-neutral-400">Pay only for what your capsules actually do. No idle costs.</p>
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name} className="border border-neutral-800 p-8">
              <p className="text-xs uppercase tracking-wider text-neutral-500">{t.caption}</p>
              <h2 className="mt-2 text-2xl font-semibold">{t.name}</h2>
              <p className="mt-4 text-4xl font-bold">{t.price}</p>
              <ul className="mt-8 space-y-3 text-sm text-neutral-400">
                {t.features.map((f) => <li key={f}>· {f}</li>)}
              </ul>
              <Link href="/dashboard" className="mt-8 inline-block w-full border border-neutral-700 px-4 py-2 text-center text-sm hover:border-white">
                Start with {t.name} →
              </Link>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ---------- Status page ----------

function StatusPage() {
  const incidents = useMemo(() => [
    { date: new Date(Date.now() - 1 * 86400_000).toISOString().slice(0, 10), title: "Minor latency increase in EU-West", status: "Resolved", duration: "12 min" },
    { date: new Date(Date.now() - 4 * 86400_000).toISOString().slice(0, 10), title: "Brief deploy queue saturation, AP-Southeast", status: "Resolved", duration: "4 min" },
    { date: new Date(Date.now() - 11 * 86400_000).toISOString().slice(0, 10), title: "Edge route flap, US-East", status: "Resolved", duration: "21 min" },
  ], []);
  const regions = [
    { name: "us-east-1", label: "US East (Virginia)", status: "operational" },
    { name: "us-west-2", label: "US West (Oregon)", status: "operational" },
    { name: "eu-west-1", label: "Europe West (Dublin)", status: "operational" },
    { name: "ap-southeast-2", label: "Asia Pacific (Sydney)", status: "operational" },
    { name: "ap-northeast-1", label: "Asia Pacific (Tokyo)", status: "operational" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex items-center gap-3">
          <span className="block h-3 w-3 rounded-full bg-emerald-500" />
          <h1 className="text-3xl font-bold">All systems operational</h1>
        </div>
        <p className="mt-2 text-neutral-500">Updated {new Date().toUTCString()}</p>

        <h2 className="mb-4 mt-12 text-sm font-semibold uppercase tracking-wider text-neutral-500">Regions</h2>
        <div className="border border-neutral-900">
          {regions.map((r) => (
            <div key={r.name} className="flex items-center justify-between border-b border-neutral-900 px-6 py-4 last:border-b-0">
              <div>
                <p className="font-mono text-sm text-white">{r.name}</p>
                <p className="text-xs text-neutral-500">{r.label}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <span className="block h-2 w-2 rounded-full bg-emerald-500" />
                operational
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-4 mt-12 text-sm font-semibold uppercase tracking-wider text-neutral-500">Recent incidents</h2>
        <div className="border border-neutral-900">
          {incidents.map((i, idx) => (
            <div key={idx} className="border-b border-neutral-900 px-6 py-4 last:border-b-0">
              <div className="flex items-baseline justify-between">
                <p className="font-medium text-white">{i.title}</p>
                <p className="text-xs text-neutral-500">{i.date}</p>
              </div>
              <p className="mt-1 text-xs text-neutral-500">{i.status} · duration {i.duration}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ---------- Built on Boglet (the reveal) ----------

function BuiltOnBoglet() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl">Boglet runs on Boglet.</h1>
        <p className="mt-8 text-lg text-neutral-400">
          The page you're reading is a Preact component inside a Lakebed capsule. But it's <em>also</em> available as a fully-fledged Boglet app — same content, served through the public runner instead of the platform chrome.
        </p>
        <p className="mt-4 text-neutral-400">Visit <Link href="/app/boglet" className="text-orange-400 hover:underline">/app/boglet</Link> to see the recursion in action.</p>
        <div className="mt-12 border border-neutral-900 bg-neutral-950 p-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">Stack</p>
          <ul className="space-y-2 font-mono text-sm">
            <li><span className="text-white">boglet</span> <span className="text-neutral-600">— the platform</span></li>
            <li className="pl-6"><span className="text-white">↳ boglet/marketing</span> <span className="text-neutral-600">— landing, served as a Boglet app</span></li>
            <li className="pl-12"><span className="text-white">↳ boglet/reveal</span> <span className="text-neutral-600">— this page (well, almost)</span></li>
            <li className="pl-18"><span className="text-white">↳ lakebed</span> <span className="text-neutral-600">— where reality bottoms out</span></li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ---------- Dashboard ----------

function Dashboard() {
  const auth = useAuth();
  const me = useQuery<{ auth: { userId: string; displayName: string; isGuest: boolean }; workspace: { id: string; name: string; plan: string } | null }>("me");
  const apps = useQuery<Array<{ id: string; slug: string; name: string; description: string; isPublic: boolean; region: string; statusBadge: string; createdAt: string }>>("listApps");
  const ensureWorkspace = useMutation<[], string>("ensureWorkspace");

  useEffect(() => {
    if (me && me.auth && !me.auth.isGuest && !me.workspace) {
      void ensureWorkspace();
    }
  }, [me?.auth?.userId, me?.workspace?.id]);

  if (auth.isLoading) {
    return <div className="min-h-screen bg-black"><Nav /></div>;
  }
  if (auth.isGuest) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Nav />
        <main className="mx-auto max-w-md px-6 py-32 text-center">
          <h1 className="mb-4 text-3xl font-bold">Sign in to deploy capsules.</h1>
          <p className="mb-8 text-neutral-400">Boglet uses Google for identity. We never see your password.</p>
          <SignInWithGoogle className="border border-white bg-white px-5 py-3 text-sm font-medium text-black hover:bg-neutral-200" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500">Workspace · {me?.workspace?.plan ?? "free"}</p>
            <h1 className="mt-1 text-3xl font-bold">{me?.workspace?.name ?? "—"}</h1>
          </div>
          <Link href="/dashboard/new" className="border border-white bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">
            Deploy new capsule →
          </Link>
        </div>

        {!apps || apps.length === 0 ? (
          <div className="border border-dashed border-neutral-800 p-12 text-center">
            <p className="text-neutral-400">no capsules yet.</p>
            <Link href="/dashboard/new" className="mt-4 inline-block text-sm text-orange-400 hover:underline">Deploy your first →</Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {apps.map((a) => (
              <Link key={a.id} href={"/dashboard/apps/" + a.slug} className="block border border-neutral-900 p-5 hover:border-neutral-700">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="truncate text-lg font-semibold text-white">{a.name}</h3>
                  <StatusDot status={a.statusBadge} />
                </div>
                <p className="mt-1 font-mono text-xs text-neutral-500">{a.slug}.boglet.app</p>
                <p className="mt-3 line-clamp-2 text-sm text-neutral-400">{a.description || <span className="text-neutral-700">no description</span>}</p>
                <p className="mt-4 text-xs text-neutral-600">{a.region} · {formatTimeAgo(a.createdAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "live" ? "bg-emerald-500" : status === "deploying" ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500">
      <span className={"block h-2 w-2 rounded-full " + color} />
      {status}
    </span>
  );
}

// ---------- New App wizard ----------

function NewAppWizard() {
  const auth = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touchedSlug, setTouchedSlug] = useState(false);
  const [template, setTemplate] = useState<TemplateKind>("todo");
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = usePath();
  const createApp = useMutation<[slug: string, name: string, template: string], { ok?: true; error?: string; slug?: string }>("createApp");

  // Auto-derive slug from name until the user edits it directly.
  const displaySlug = touchedSlug ? slug : slugify(name);

  if (auth.isLoading) return <div className="min-h-screen bg-black"><Nav /></div>;
  if (auth.isGuest) { navigate("/dashboard"); return null; }

  async function onDeploy(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    const finalSlug = touchedSlug ? slug : slugify(name);
    if (!isValidSlug(finalSlug)) { setError("slug must be lowercase a-z, 0-9, dashes (2-48 chars)"); return; }
    setDeploying(true);
    try {
      const res = await createApp(finalSlug, name || finalSlug, template);
      if (res?.error) { setError(res.error); setDeploying(false); return; }
      if (res?.ok && res.slug) {
        navigate("/dashboard/apps/" + res.slug);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
      setDeploying(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-white">← Dashboard</Link>
        <h1 className="mt-4 mb-2 text-3xl font-bold">Deploy a new capsule</h1>
        <p className="mb-10 text-neutral-400">Pick a template, give it a name, and deploy.</p>

        <form onSubmit={(e) => void onDeploy(e)} className="space-y-8">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-neutral-500">Name</label>
            <input
              autoFocus
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder="my todo app"
              className="w-full border border-neutral-800 bg-black px-3 py-2 text-white outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-neutral-500">Slug</label>
            <div className="flex items-center border border-neutral-800 focus-within:border-white">
              <input
                value={displaySlug}
                onInput={(e) => { setSlug((e.target as HTMLInputElement).value); setTouchedSlug(true); }}
                placeholder="my-todo-app"
                className="min-w-0 flex-1 bg-black px-3 py-2 text-white outline-none"
              />
              <span className="px-3 text-sm text-neutral-500">.boglet.app</span>
            </div>
            <p className="mt-1 font-mono text-xs text-neutral-600">lowercase letters, numbers, dashes</p>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-neutral-500">Template</label>
            <div className="grid gap-2">
              {(Object.keys(TEMPLATE_LABELS) as TemplateKind[]).filter((k) => k !== "boglet").map((k) => (
                <label key={k} className={"flex cursor-pointer items-center gap-3 border px-4 py-3 " + (template === k ? "border-white" : "border-neutral-800 hover:border-neutral-700")}>
                  <input type="radio" name="template" checked={template === k} onChange={() => setTemplate(k)} className="accent-white" />
                  <div>
                    <p className="text-sm font-medium">{TEMPLATE_LABELS[k]}</p>
                    <p className="text-xs text-neutral-500">{TEMPLATES[k].description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error ? <p className="border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">{error}</p> : null}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={deploying} className="border border-white bg-white px-5 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {deploying ? "Deploying…" : "Deploy capsule →"}
            </button>
            <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-white">Cancel</Link>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}

// ---------- App detail (deploys / logs / metrics / env / schedules) ----------

type AppRow = { id: string; slug: string; name: string; description: string; isPublic: boolean; region: string; statusBadge: string; activeDeployId: string; createdAt: string; ownerId: string };
type DeployRow = { id: string; version: string; manifest: string; status: string; createdAt: string };

function AppDetail({ slug }: { slug: string }) {
  const [tab, setTab] = useState<"overview" | "deploys" | "logs" | "metrics" | "env" | "schedules" | "settings">("overview");
  const getApp = useMutation<[slug: string], { app: AppRow; active: DeployRow | null; deploys: DeployRow[] } | null>("getApp");
  const [data, refresh] = useFetched(() => getApp(slug), [slug]);
  const [, navigate] = usePath();
  const tickSchedules = useMutation<[appId: string], unknown>("tickSchedules");

  // Pulse schedules every 30s while viewing this app, and refetch app state.
  useEffect(() => {
    if (!data?.app) return;
    const t = setInterval(() => { void tickSchedules(data.app.id); refresh(); }, 30_000);
    return () => clearInterval(t);
  }, [data?.app?.id]);

  if (data === undefined) return <div className="min-h-screen bg-black text-white"><Nav /><main className="mx-auto max-w-6xl px-6 py-16"><p className="text-neutral-500">Loading…</p></main></div>;
  if (data === null) return <NotFound />;

  const tabs: Array<{ key: typeof tab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "deploys", label: "Deploys" },
    { key: "logs", label: "Logs" },
    { key: "metrics", label: "Metrics" },
    { key: "env", label: "Environment" },
    { key: "schedules", label: "Schedules" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-white">← Dashboard</Link>
        <div className="mt-3 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{data.app.name}</h1>
              <StatusDot status={data.app.statusBadge} />
            </div>
            <p className="mt-1 font-mono text-sm text-neutral-500">{data.app.slug}.boglet.app · {data.app.region}</p>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">{data.app.description || <span className="text-neutral-700">no description</span>}</p>
          </div>
          <div className="flex gap-2">
            <a href={"#/app/" + data.app.slug} target="_blank" rel="noopener noreferrer" className="border border-neutral-700 px-4 py-2 text-sm hover:border-white">Open ↗</a>
            <Link href={"/dashboard/apps/" + data.app.slug + "/edit"} className="border border-white bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">Edit manifest</Link>
          </div>
        </div>

        <div className="mt-8 border-b border-neutral-900">
          <div className="flex gap-6 text-sm">
            {tabs.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} className={"-mb-px border-b-2 py-3 " + (tab === t.key ? "border-white text-white" : "border-transparent text-neutral-500 hover:text-white")}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {tab === "overview" && <OverviewTab app={data.app} active={data.active} />}
          {tab === "deploys" && <DeploysTab app={data.app} deploys={data.deploys} />}
          {tab === "logs" && <LogsTab appId={data.app.id} />}
          {tab === "metrics" && <MetricsTab appId={data.app.id} />}
          {tab === "env" && <EnvTab appId={data.app.id} />}
          {tab === "schedules" && <SchedulesTab app={data.app} active={data.active} />}
          {tab === "settings" && <SettingsTab app={data.app} onDeleted={() => navigate("/dashboard")} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function OverviewTab({ app, active }: { app: AppRow; active: DeployRow | null }) {
  const stats = [
    { label: "Active version", value: active ? "v" + active.version : "—" },
    { label: "Region", value: app.region },
    { label: "Visibility", value: app.isPublic ? "public" : "private" },
    { label: "Last deploy", value: active ? formatTimeAgo(active.createdAt) : "—" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-neutral-900 p-4">
            <p className="text-xs uppercase tracking-wider text-neutral-500">{s.label}</p>
            <p className="mt-1 text-lg font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 border border-neutral-900">
        <div className="border-b border-neutral-900 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Active manifest</h3>
        </div>
        <pre className="overflow-x-auto p-6 font-mono text-xs leading-relaxed text-neutral-300">
{active ? prettyPrintManifest(active.manifest) : "No active deploy."}
        </pre>
      </div>
    </div>
  );
}

function prettyPrintManifest(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    // Keep pages collapsed since they can be huge HTML strings.
    if (parsed.pages) {
      for (const k of Object.keys(parsed.pages)) {
        const html = parsed.pages[k] as string;
        parsed.pages[k] = "<html (" + html.length + " chars omitted)>";
      }
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

function DeploysTab({ app, deploys }: { app: AppRow; deploys: DeployRow[] }) {
  const rollback = useMutation<[appId: string, deployId: string], unknown>("rollbackDeploy");
  const [busy, setBusy] = useState<string | null>(null);
  if (deploys.length === 0) return <p className="text-neutral-500">No deploys yet.</p>;
  return (
    <div className="border border-neutral-900">
      {deploys.map((d) => (
        <div key={d.id} className="flex items-center justify-between border-b border-neutral-900 px-6 py-4 last:border-b-0">
          <div>
            <p className="font-mono text-sm text-white">v{d.version} {app.activeDeployId === d.id ? <span className="ml-2 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] uppercase text-emerald-400">live</span> : null}</p>
            <p className="mt-1 text-xs text-neutral-500">{formatTimeAgo(d.createdAt)} · {(d.manifest || "").length} bytes</p>
          </div>
          {app.activeDeployId !== d.id ? (
            <button
              type="button"
              disabled={busy === d.id}
              onClick={async () => { setBusy(d.id); try { await rollback(app.id, d.id); } finally { setBusy(null); } }}
              className="border border-neutral-700 px-3 py-1 text-xs hover:border-white disabled:opacity-50"
            >
              {busy === d.id ? "…" : "Rollback"}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function LogsTab({ appId }: { appId: string }) {
  const listLogs = useMutation<[appId: string], Array<{ id: string; level: string; source: string; message: string; createdAt: string }>>("listAppLogs");
  const [logs, refresh] = useFetched(() => listLogs(appId), [appId]);
  useEffect(() => {
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [appId]);
  if (logs === undefined) return <p className="text-neutral-500">Loading…</p>;
  if (!logs || logs.length === 0) return <p className="text-neutral-500">No log lines yet. Run your capsule to see activity.</p>;
  const color = (level: string) => level === "error" ? "text-red-400" : level === "warn" ? "text-amber-400" : "text-neutral-400";
  return (
    <div className="border border-neutral-900 bg-neutral-950 font-mono text-xs">
      {logs.map((l) => (
        <div key={l.id} className="grid grid-cols-[120px_60px_140px_1fr] gap-3 border-b border-neutral-900 px-4 py-2 last:border-b-0">
          <span className="text-neutral-600">{l.createdAt.slice(11, 19)}</span>
          <span className={color(l.level)}>{l.level}</span>
          <span className="text-neutral-500">{l.source}</span>
          <span className="text-neutral-300">{l.message}</span>
        </div>
      ))}
    </div>
  );
}

function MetricsTab({ appId }: { appId: string }) {
  const listMetrics = useMutation<[appId: string], Array<{ id: string; metric: string; bucket: string; value: string }>>("listAppMetrics");
  const [metrics, refresh] = useFetched(() => listMetrics(appId), [appId]);
  useEffect(() => {
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [appId]);
  if (!metrics) return null;
  const requests = metrics.filter((m) => m.metric === "requests").reduce((a, m) => a + Number(m.value || 0), 0);
  const errors = metrics.filter((m) => m.metric === "errors").reduce((a, m) => a + Number(m.value || 0), 0);
  const errorRate = requests === 0 ? 0 : (errors / requests) * 100;
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="border border-neutral-900 p-4"><p className="text-xs uppercase tracking-wider text-neutral-500">Requests (all-time)</p><p className="mt-1 text-2xl font-bold">{requests.toLocaleString()}</p></div>
        <div className="border border-neutral-900 p-4"><p className="text-xs uppercase tracking-wider text-neutral-500">Errors</p><p className="mt-1 text-2xl font-bold">{errors.toLocaleString()}</p></div>
        <div className="border border-neutral-900 p-4"><p className="text-xs uppercase tracking-wider text-neutral-500">Error rate</p><p className="mt-1 text-2xl font-bold">{errorRate.toFixed(2)}%</p></div>
        <div className="border border-neutral-900 p-4"><p className="text-xs uppercase tracking-wider text-neutral-500">p99 latency</p><p className="mt-1 text-2xl font-bold">41ms</p></div>
      </div>
      <p className="mt-8 text-xs text-neutral-600">Hourly bucket aggregation. Higher-resolution metrics available on Enterprise.</p>
    </div>
  );
}

function EnvTab({ appId }: { appId: string }) {
  const listKeys = useMutation<[appId: string], Array<{ id: string; key: string; createdAt: string }>>("listAppEnvKeys");
  const [keys, refresh] = useFetched(() => listKeys(appId), [appId]);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const setEnv = useMutation<[appId: string, key: string, value: string], { ok?: true; error?: string }>("setAppEnv");
  const delEnv = useMutation<[appId: string, key: string], unknown>("deleteAppEnv");
  const [err, setErr] = useState<string | null>(null);

  async function onAdd(e: SubmitEvent) {
    e.preventDefault();
    setErr(null);
    const res = await setEnv(appId, newKey, newVal);
    if (res?.error) setErr(res.error);
    else { setNewKey(""); setNewVal(""); refresh(); }
  }

  async function onDelete(key: string) {
    await delEnv(appId, key);
    refresh();
  }

  return (
    <div>
      <p className="mb-6 text-sm text-neutral-400">Server-only values your capsule can read. Stored with at-rest obfuscation. Never exposed to client code.</p>
      <form onSubmit={(e) => void onAdd(e)} className="mb-8 flex gap-2">
        <input value={newKey} onInput={(e) => setNewKey((e.target as HTMLInputElement).value.toUpperCase())} placeholder="STRIPE_API_KEY" className="w-48 border border-neutral-800 bg-black px-3 py-2 font-mono text-sm uppercase outline-none focus:border-white" />
        <input value={newVal} onInput={(e) => setNewVal((e.target as HTMLInputElement).value)} type="password" placeholder="value" className="flex-1 border border-neutral-800 bg-black px-3 py-2 text-sm outline-none focus:border-white" />
        <button type="submit" className="border border-white bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">Set</button>
      </form>
      {err ? <p className="mb-4 text-sm text-red-400">{err}</p> : null}
      {!keys || keys.length === 0 ? (
        <p className="text-neutral-500">No environment variables set.</p>
      ) : (
        <div className="border border-neutral-900">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between border-b border-neutral-900 px-6 py-3 last:border-b-0">
              <div>
                <p className="font-mono text-sm">{k.key}</p>
                <p className="text-xs text-neutral-500">added {formatTimeAgo(k.createdAt)}</p>
              </div>
              <button type="button" onClick={() => void onDelete(k.key)} className="text-xs text-neutral-500 hover:text-red-400">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SchedulesTab({ app, active }: { app: AppRow; active: DeployRow | null }) {
  const listSchedulesMut = useMutation<[appId: string], Array<{ id: string; name: string; spec: string; mutationName: string; lastRunAt: string; enabled: boolean }>>("listSchedules");
  const [schedules, refresh] = useFetched(() => listSchedulesMut(app.id), [app.id]);
  const createSchedule = useMutation<[appId: string, name: string, spec: string, mutation: string, argsJson: string], unknown>("createSchedule");
  const deleteSchedule = useMutation<[id: string], unknown>("deleteSchedule");
  const [name, setName] = useState("");
  const [spec, setSpec] = useState("@hour");
  const [mname, setMname] = useState("");

  const availableMutations = useMemo(() => {
    if (!active) return [];
    try {
      const m = JSON.parse(active.manifest) as Manifest;
      return Object.keys(m.mutations || {});
    } catch { return []; }
  }, [active?.id]);

  async function onAdd(e: SubmitEvent) {
    e.preventDefault();
    if (!mname) return;
    await createSchedule(app.id, name || "schedule", spec, mname, "[]");
    setName(""); setMname("");
    refresh();
  }

  async function onDelete(id: string) {
    await deleteSchedule(id);
    refresh();
  }

  return (
    <div>
      <p className="mb-6 text-sm text-neutral-400">Cron-style scheduled mutations. Triggered when traffic hits your dashboard. Use specs <code className="font-mono text-orange-400">@minute</code>, <code className="font-mono text-orange-400">@hour</code>, <code className="font-mono text-orange-400">@day</code>, or <code className="font-mono text-orange-400">every 5m</code>.</p>

      <form onSubmit={(e) => void onAdd(e)} className="mb-8 grid gap-2 md:grid-cols-[1fr_120px_180px_auto]">
        <input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder="schedule name" className="border border-neutral-800 bg-black px-3 py-2 text-sm outline-none focus:border-white" />
        <input value={spec} onInput={(e) => setSpec((e.target as HTMLInputElement).value)} placeholder="@hour" className="border border-neutral-800 bg-black px-3 py-2 font-mono text-sm outline-none focus:border-white" />
        <select value={mname} onChange={(e) => setMname((e.target as HTMLSelectElement).value)} className="border border-neutral-800 bg-black px-3 py-2 text-sm outline-none focus:border-white">
          <option value="">— pick a mutation —</option>
          {availableMutations.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button type="submit" className="border border-white bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">Add</button>
      </form>

      {!schedules || schedules.length === 0 ? (
        <p className="text-neutral-500">No schedules.</p>
      ) : (
        <div className="border border-neutral-900">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between border-b border-neutral-900 px-6 py-3 last:border-b-0">
              <div>
                <p className="font-medium text-white">{s.name}</p>
                <p className="font-mono text-xs text-neutral-500">{s.spec} · {s.mutationName}{s.lastRunAt ? " · last ran " + formatTimeAgo(s.lastRunAt) : " · never run"}</p>
              </div>
              <button type="button" onClick={() => void onDelete(s.id)} className="text-xs text-neutral-500 hover:text-red-400">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ app, onDeleted }: { app: AppRow; onDeleted: () => void }) {
  const [name, setName] = useState(app.name);
  const [desc, setDesc] = useState(app.description);
  const [isPublic, setIsPublic] = useState(app.isPublic);
  const update = useMutation<[appId: string, name: string, description: string, isPublic: boolean], unknown>("updateApp");
  const del = useMutation<[appId: string], unknown>("deleteApp");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSave(e: SubmitEvent) {
    e.preventDefault();
    setBusy(true);
    try { await update(app.id, name, desc, isPublic); } finally { setBusy(false); }
  }

  return (
    <div>
      <form onSubmit={(e) => void onSave(e)} className="space-y-6 border border-neutral-900 p-6">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-neutral-500">Display name</label>
          <input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} className="w-full border border-neutral-800 bg-black px-3 py-2 outline-none focus:border-white" />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-neutral-500">Description</label>
          <textarea value={desc} onInput={(e) => setDesc((e.target as HTMLTextAreaElement).value)} className="min-h-[80px] w-full border border-neutral-800 bg-black px-3 py-2 outline-none focus:border-white" />
        </div>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic((e.target as HTMLInputElement).checked)} className="accent-white" />
          <span className="text-sm">Public — anyone can view <code className="font-mono text-orange-400">/app/{app.slug}</code></span>
        </label>
        <button type="submit" disabled={busy} className="border border-white bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
      </form>

      <div className="mt-8 border border-red-950 p-6">
        <h3 className="mb-2 text-sm font-semibold text-red-300">Danger zone</h3>
        <p className="mb-4 text-sm text-neutral-400">Permanently delete this capsule and all its data, deploys, logs, metrics, and secrets.</p>
        {confirming ? (
          <div className="flex gap-2">
            <button type="button" onClick={async () => { await del(app.id); onDeleted(); }} className="border border-red-500 bg-red-950 px-4 py-2 text-sm text-red-200 hover:bg-red-900">Yes, delete forever</button>
            <button type="button" onClick={() => setConfirming(false)} className="border border-neutral-700 px-4 py-2 text-sm hover:border-white">Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="border border-red-900 px-4 py-2 text-sm text-red-300 hover:border-red-500">Delete capsule</button>
        )}
      </div>
    </div>
  );
}

// ---------- Manifest editor ----------

function ManifestEditor({ slug }: { slug: string }) {
  const getApp = useMutation<[slug: string], { app: AppRow; active: DeployRow | null; deploys: DeployRow[] } | null>("getApp");
  const [data, refresh] = useFetched(() => getApp(slug), [slug]);
  const deployMutation = useMutation<[appId: string, manifestJson: string], { ok?: true; error?: string; version?: string }>("deployManifest");
  const [text, setText] = useState<string>("");
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [, navigate] = usePath();

  useEffect(() => {
    if (!seeded && data?.active) {
      try {
        const parsed = JSON.parse(data.active.manifest);
        setText(JSON.stringify(parsed, null, 2));
      } catch { setText(data.active.manifest); }
      setSeeded(true);
    }
  }, [data?.active?.id, seeded]);

  async function onDeploy() {
    setError(null); setStatus(null);
    try {
      JSON.parse(text); // surface parse errors
    } catch (e) {
      setError("JSON parse error: " + (e instanceof Error ? e.message : "invalid"));
      return;
    }
    if (!data?.app) return;
    setBusy(true);
    try {
      const res = await deployMutation(data.app.id, text);
      if (res?.error) setError(res.error);
      else { setStatus("Deployed v" + res?.version); refresh(); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "deploy failed");
    } finally {
      setBusy(false);
    }
  }

  if (data === undefined) return <div className="min-h-screen bg-black text-white"><Nav /><main className="mx-auto max-w-6xl px-6 py-16"><p className="text-neutral-500">Loading…</p></main></div>;
  if (data === null) return <NotFound />;

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link href={"/dashboard/apps/" + slug} className="text-sm text-neutral-500 hover:text-white">← Back to {slug}</Link>
        <div className="mt-3 mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-bold">Edit manifest</h1>
            <p className="mt-1 text-sm text-neutral-500">{slug}.boglet.app · currently v{data.active?.version ?? "—"}</p>
          </div>
          <div className="flex items-center gap-2">
            {status ? <span className="text-sm text-emerald-400">{status}</span> : null}
            <button type="button" disabled={busy} onClick={() => void onDeploy()} className="border border-white bg-white px-5 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {busy ? "Deploying…" : "Deploy →"}
            </button>
          </div>
        </div>

        {error ? <p className="mb-4 border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">{error}</p> : null}

        <textarea
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          spellCheck={false}
          className="min-h-[60vh] w-full border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-200 outline-none focus:border-white"
        />
        <p className="mt-2 text-xs text-neutral-600">{text.length.toLocaleString()} bytes</p>
      </main>
    </div>
  );
}

// ---------- Runner (iframe + postMessage bridge) ----------

const BOGLET_HELPER_JS = `(function(){
  const pending = new Map();
  let nextId = 1;
  let ready = false;
  const readyCbs = [];
  let cachedAuth = null;
  function postRpc(kind, name, args) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      parent.postMessage({ bogletRpc: { id, kind, name, args: args || [] } }, '*');
      setTimeout(() => {
        if (pending.has(id)) { pending.delete(id); reject(new Error('rpc timeout')); }
      }, 30000);
    });
  }
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.bogletRpcResult) {
      const { id, data, error } = d.bogletRpcResult;
      const p = pending.get(id);
      if (p) { pending.delete(id); if (error) p.reject(new Error(error)); else p.resolve(data); }
    }
    if (d.bogletReady) { cachedAuth = d.bogletReady.auth || null; ready = true; for (const cb of readyCbs.splice(0)) { try { cb(); } catch(e) { console.error(e); } } }
  });
  window.boglet = {
    query: (name, args) => postRpc('query', name, args),
    mutation: (name, args) => postRpc('mutation', name, args),
    auth: () => cachedAuth,
    onReady: (cb) => { if (ready) cb(); else readyCbs.push(cb); }
  };
  parent.postMessage({ bogletLoaded: true }, '*');
})();`;

function Runner({ slug, subPath }: { slug: string; subPath: string }) {
  const auth = useAuth();
  const getAppPublic = useMutation<[slug: string], { app: { id: string; slug: string; name: string; description: string; region: string }; manifest: string; version: string } | null>("getAppPublic");
  const [data] = useFetched(() => getAppPublic(slug), [slug]);
  // Both queries and mutations from the iframe route through one dispatch
  // mutation. Lakebed's useMutation accepts dynamic args at call time; useQuery
  // binds them at mount, so a mutation is the right channel for dispatch.
  const runUserCall = useMutation<[slug: string, name: string, args: unknown], { ok?: boolean; data?: unknown; error?: string }>("runUserCall");

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const wrappedHtml = useMemo(() => {
    if (!data) return null;
    let manifest: Manifest | null = null;
    try { manifest = JSON.parse(data.manifest) as Manifest; } catch { manifest = null; }
    if (!manifest) return null;
    const pageHtml = manifest.pages[subPath] ?? manifest.pages["/"] ?? "<html><body><h1>404</h1></body></html>";
    // Inject the helper before any user script.
    const helperTag = "<script>" + BOGLET_HELPER_JS + "</script>";
    if (pageHtml.includes("</head>")) {
      return pageHtml.replace("</head>", helperTag + "</head>");
    }
    if (pageHtml.includes("<body")) {
      return pageHtml.replace("<body", helperTag + "<body");
    }
    return helperTag + pageHtml;
  }, [data?.manifest, subPath]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (!e.data || typeof e.data !== "object") return;
      const iframe = iframeRef.current;
      if (!iframe || e.source !== iframe.contentWindow) return;

      if ((e.data as { bogletLoaded?: boolean }).bogletLoaded) {
        // Send ready signal with auth.
        iframe.contentWindow?.postMessage({
          bogletReady: {
            auth: {
              userId: auth.userId,
              displayName: auth.displayName,
              isGuest: auth.isGuest,
              picture: auth.picture ?? "",
            },
          },
        }, "*");
        return;
      }

      const rpc = (e.data as { bogletRpc?: { id: number; kind: "query" | "mutation"; name: string; args: unknown[] } }).bogletRpc;
      if (!rpc) return;
      void (async () => {
        try {
          const res = await runUserCall(slug, rpc.name, rpc.args);
          iframe.contentWindow?.postMessage({
            bogletRpcResult: {
              id: rpc.id,
              data: res?.ok ? res.data : null,
              error: res?.error,
            },
          }, "*");
        } catch (err) {
          iframe.contentWindow?.postMessage({
            bogletRpcResult: { id: rpc.id, error: err instanceof Error ? err.message : "rpc failed" },
          }, "*");
        }
      })();
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [slug, auth.userId, auth.isGuest, runUserCall]);

  if (data === undefined) {
    return <div className="grid min-h-screen place-items-center bg-black text-neutral-500">Loading capsule…</div>;
  }
  if (!data) {
    return <div className="grid min-h-screen place-items-center bg-black text-neutral-500">No capsule deployed at <span className="font-mono text-white">{slug}.boglet.app</span></div>;
  }
  if (!wrappedHtml) {
    return <div className="grid min-h-screen place-items-center bg-black text-neutral-500">Capsule has no page at {subPath}.</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-black">
      <div className="flex items-center justify-between border-b border-neutral-900 px-4 py-2 text-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold text-white">Boglet</Link>
          <span className="text-neutral-700">/</span>
          <span className="font-mono text-neutral-400">{slug}.boglet.app</span>
          <span className="border border-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500">v{data.version}</span>
          <span className="text-neutral-700">·</span>
          <span className="text-neutral-500">{data.app.region}</span>
        </div>
        <a href="#/" className="text-neutral-500 hover:text-white">Make your own →</a>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={wrappedHtml}
        sandbox="allow-scripts allow-forms"
        className="h-full w-full flex-1 border-0 bg-white"
        title={data.app.name}
      />
    </div>
  );
}

// ---------- 404 ----------

function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main className="mx-auto max-w-md px-6 py-32 text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-4 text-neutral-500">No capsule deployed at this route.</p>
        <Link href="/" className="mt-8 inline-block border border-white bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">← Back to home</Link>
      </main>
    </div>
  );
}
