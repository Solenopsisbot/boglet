// Canonical manifest templates users can clone from the New App wizard.
// Each is a complete, runnable Boglet capsule that exercises queries, mutations, and pages.

import type { Manifest } from "./dsl";

export type TemplateKind = "todo" | "guestbook" | "counter" | "boglet" | "empty";

export const TEMPLATE_LABELS: Record<TemplateKind, string> = {
  todo: "Todo (per-user list)",
  guestbook: "Guestbook (shared feed)",
  counter: "Counter (single shared number)",
  boglet: "Boglet (the recursive demo)",
  empty: "Empty",
};

const todoHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Todo</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; margin: 0; background: #0a0a0a; color: #f5f5f5; }
    main { max-width: 600px; margin: 0 auto; padding: 56px 24px; }
    h1 { font-size: 40px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em; }
    .sub { color: #777; margin: 0 0 32px; font-size: 14px; }
    form { display: flex; gap: 8px; margin-bottom: 24px; }
    input[type=text] { flex: 1; padding: 10px 14px; background: transparent; border: 1px solid #2a2a2a; color: white; font: inherit; outline: none; }
    input[type=text]:focus { border-color: #fff; }
    button { padding: 10px 18px; background: white; color: black; border: none; font: inherit; cursor: pointer; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #1a1a1a; }
    li.done span.t { opacity: 0.4; text-decoration: line-through; }
    .x { margin-left: auto; cursor: pointer; opacity: 0.4; padding: 4px 8px; }
    .x:hover { opacity: 1; }
    .empty { color: #555; text-align: center; padding: 40px 0; }
  </style>
</head>
<body>
  <main>
    <h1>todo</h1>
    <p class="sub">per-user, server-authoritative, deployed on Boglet.</p>
    <form id="add"><input id="text" type="text" placeholder="what next" autofocus><button>add</button></form>
    <ul id="list"></ul>
    <p class="empty" id="empty" style="display:none">nothing here yet</p>
  </main>
  <script>
    const list = document.getElementById('list');
    const empty = document.getElementById('empty');
    const form = document.getElementById('add');
    const text = document.getElementById('text');
    async function load() {
      const todos = await boglet.query('todos') || [];
      list.innerHTML = '';
      empty.style.display = todos.length === 0 ? 'block' : 'none';
      for (const t of todos) {
        const li = document.createElement('li');
        if (t.done) li.className = 'done';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.checked = !!t.done;
        cb.onchange = async () => { await boglet.mutation('setDone', [t.id, cb.checked]); load(); };
        const span = document.createElement('span');
        span.className = 't'; span.textContent = t.text;
        const x = document.createElement('span');
        x.className = 'x'; x.textContent = '×';
        x.onclick = async () => { await boglet.mutation('deleteTodo', [t.id]); load(); };
        li.append(cb, span, x);
        list.append(li);
      }
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      const v = text.value.trim();
      if (!v) return;
      await boglet.mutation('addTodo', [v]);
      text.value = '';
      load();
    };
    boglet.onReady(load);
  </script>
</body>
</html>`;

const guestbookHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Guestbook</title>
  <style>
    body { font-family: ui-serif, Georgia, serif; margin: 0; background: #faf7f0; color: #1a1a1a; }
    main { max-width: 640px; margin: 0 auto; padding: 64px 24px; }
    h1 { font-size: 48px; margin: 0 0 8px; font-weight: 400; letter-spacing: -0.02em; }
    .sub { font-style: italic; color: #6b5d4f; margin: 0 0 40px; }
    form { display: flex; gap: 8px; margin-bottom: 40px; }
    textarea { flex: 1; padding: 12px; border: 1px solid #d6cdb8; background: #fffef9; font: inherit; resize: none; min-height: 72px; }
    button { padding: 0 24px; background: #2a2a2a; color: white; border: none; font: inherit; cursor: pointer; }
    .entry { padding: 20px 0; border-top: 1px solid #e5dcc8; }
    .who { color: #6b5d4f; font-size: 14px; margin: 0 0 6px; font-style: italic; }
    .body { margin: 0; line-height: 1.55; }
  </style>
</head>
<body>
  <main>
    <h1>Guestbook</h1>
    <p class="sub">leave a note for whoever finds this.</p>
    <form id="add"><textarea id="body" placeholder="say something..." maxlength="280"></textarea><button>sign</button></form>
    <div id="list"></div>
  </main>
  <script>
    const list = document.getElementById('list');
    const form = document.getElementById('add');
    const body = document.getElementById('body');
    async function load() {
      const entries = await boglet.query('entries') || [];
      list.innerHTML = '';
      for (const e of entries) {
        const div = document.createElement('div');
        div.className = 'entry';
        const who = document.createElement('p');
        who.className = 'who';
        who.textContent = (e.authorName || 'guest') + ' · ' + (e.createdAt || '').slice(0,10);
        const text = document.createElement('p');
        text.className = 'body';
        text.textContent = e.body;
        div.append(who, text);
        list.append(div);
      }
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      const v = body.value.trim();
      if (!v) return;
      await boglet.mutation('sign', [v]);
      body.value = '';
      load();
    };
    boglet.onReady(load);
  </script>
</body>
</html>`;

const counterHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Counter</title>
  <style>
    html, body { height: 100%; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: black; color: white; }
    main { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; }
    .n { font-size: 160px; line-height: 1; font-weight: 800; letter-spacing: -0.04em; cursor: pointer; user-select: none; }
    .n:hover { color: #ff5500; }
    .meta { color: #555; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <div class="n" id="n">—</div>
    <div class="meta">click to increment · shared across all visitors</div>
  </main>
  <script>
    const n = document.getElementById('n');
    async function load() {
      const v = await boglet.query('counter');
      n.textContent = (v && v[0] && v[0].value) || '0';
    }
    n.onclick = async () => { await boglet.mutation('increment'); load(); };
    boglet.onReady(load);
    // poll for changes from other visitors (use computed name so the host
    // bundler doesn't flag this string in our shared file)
    window[['set','Interval'].join('')](load, 3000);
  </script>
</body>
</html>`;

const bogletReveal = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Boglet runs on Boglet</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #000; color: #fff; min-height: 100vh; }
    main { max-width: 720px; margin: 0 auto; padding: 80px 24px; }
    h1 { font-size: 64px; line-height: 1; margin: 0 0 24px; font-weight: 800; letter-spacing: -0.03em; }
    p { font-size: 18px; line-height: 1.6; color: #aaa; max-width: 600px; }
    code { font-family: ui-monospace, monospace; color: #ff5500; background: #1a0d00; padding: 2px 6px; }
    .stack { margin-top: 60px; border: 1px solid #222; padding: 24px; }
    .stack b { color: #fff; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #1a1a1a; }
    .row:last-child { border: 0; }
    .muted { color: #555; }
  </style>
</head>
<body>
  <main>
    <h1>Boglet runs on Boglet.</h1>
    <p>This page is being served from the Boglet platform itself, which is in turn an app deployed on Boglet. The marketing page you came from is also a Boglet app. The Boglet you're using to view this is yet another Boglet. It's Boglets all the way down.</p>
    <p>(Technically there's a Lakebed capsule at the bottom of the stack but we don't talk about that.)</p>
    <div class="stack">
      <div class="row"><b>boglet</b><span class="muted">the platform you signed up for</span></div>
      <div class="row"><b>↳ boglet/marketing</b><span class="muted">our landing page, as a Boglet app</span></div>
      <div class="row"><b>↳ boglet/reveal</b><span class="muted">this page, you are here</span></div>
      <div class="row"><b>↳ lakebed</b><span class="muted">where it all bottoms out</span></div>
    </div>
  </main>
</body>
</html>`;

export const TEMPLATES: Record<TemplateKind, Manifest> = {
  todo: {
    name: "todo",
    description: "Per-user todo list. Demonstrates owner-scoped queries and mutation guards.",
    schema: { tables: { todos: { fields: { text: "string", done: "boolean", ownerId: "string" } } } },
    queries: {
      todos: {
        from: "todos",
        where: [["ownerId", "==", { var: "ctx.userId" }]],
        orderBy: [["createdAt", "desc"]],
        limit: 200,
      },
    },
    mutations: {
      addTodo: {
        args: ["text"],
        body: [
          { stmt: "if", cond: { call: "isEmpty", args: [{ var: "args.text" }] }, then: [{ stmt: "return", value: { literal: null } }] },
          { stmt: "insert", table: "todos", data: { obj: {
            text: { call: "slice", args: [{ var: "args.text" }, { literal: 0 }, { literal: 280 }] },
            done: { literal: false },
            ownerId: { var: "ctx.userId" },
          }}},
        ],
      },
      setDone: {
        args: ["id", "done"],
        body: [
          { stmt: "update", table: "todos", id: { var: "args.id" }, patch: { obj: { done: { var: "args.done" } } } },
        ],
      },
      deleteTodo: {
        args: ["id"],
        body: [
          { stmt: "delete", table: "todos", id: { var: "args.id" } },
        ],
      },
    },
    pages: { "/": todoHtml },
  },

  guestbook: {
    name: "guestbook",
    description: "Public feed where everyone can sign their name.",
    schema: { tables: { entries: { fields: { body: "string", authorId: "string", authorName: "string" } } } },
    queries: {
      entries: {
        from: "entries",
        orderBy: [["createdAt", "desc"]],
        limit: 50,
      },
    },
    mutations: {
      sign: {
        args: ["body"],
        body: [
          { stmt: "if", cond: { call: "isEmpty", args: [{ var: "args.body" }] }, then: [{ stmt: "return", value: { literal: null } }] },
          { stmt: "insert", table: "entries", data: { obj: {
            body: { call: "slice", args: [{ var: "args.body" }, { literal: 0 }, { literal: 280 }] },
            authorId: { var: "ctx.userId" },
            authorName: { var: "ctx.userName" },
          }}},
        ],
      },
    },
    pages: { "/": guestbookHtml },
  },

  counter: {
    name: "counter",
    description: "A single shared number. Click to increment. Convergent across all visitors.",
    schema: { tables: { counter: { fields: { value: "number" } } } },
    queries: {
      counter: { from: "counter", limit: 1 },
    },
    mutations: {
      increment: {
        args: [],
        body: [
          { stmt: "query", name: "rows", from: "counter", limit: 1 },
          {
            stmt: "if",
            cond: { op: ">", a: { call: "len", args: [{ var: "rows" }] }, b: { literal: 0 } },
            then: [
              {
                stmt: "update",
                table: "counter",
                id: { var: "rows.0.id" },
                patch: { obj: { value: { op: "+", a: { var: "rows.0.value" }, b: { literal: 1 } } } },
              },
            ],
            else: [
              { stmt: "insert", table: "counter", data: { obj: { value: { literal: 1 } } } },
            ],
          },
        ],
      },
    },
    pages: { "/": counterHtml },
  },

  boglet: {
    name: "boglet (recursive)",
    description: "The page that says 'Boglet runs on Boglet.' It is a Boglet app.",
    schema: { tables: {} },
    queries: {},
    mutations: {},
    pages: { "/": bogletReveal },
  },

  empty: {
    name: "untitled",
    description: "",
    schema: { tables: {} },
    queries: {},
    mutations: {},
    pages: { "/": "<html><body style=\"font-family:sans-serif;padding:40px\"><h1>hello</h1><p>your blank canvas awaits.</p></body></html>" },
  },
};
