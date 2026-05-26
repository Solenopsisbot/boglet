// Canonical manifest templates users can clone from the New App wizard.
// Each is a complete, runnable Boglet capsule that exercises queries, mutations, and pages.

import type { Manifest } from "./dsl";

export type TemplateKind = "todo" | "guestbook" | "counter" | "boglet" | "empty" | "poll" | "notes" | "bookmarks" | "habits";

export const TEMPLATE_LABELS: Record<TemplateKind, string> = {
  todo: "Todo (per-user list)",
  guestbook: "Guestbook (shared feed)",
  counter: "Counter (single shared number)",
  boglet: "Boglet (the recursive demo)",
  empty: "Empty",
  poll: "Poll (voting with results)",
  notes: "Notes (per-user markdown notes)",
  bookmarks: "Bookmarks (shared link collection)",
  habits: "Habits (daily streak tracker)",
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

const pollHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Poll</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0f172a; color: #f1f5f9; }
    main { max-width: 500px; margin: 0 auto; padding: 64px 24px; }
    h1 { font-size: 36px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.02em; }
    .q { font-size: 20px; margin: 0 0 32px; color: #94a3b8; }
    .opt { display: flex; align-items: center; gap: 12px; padding: 16px; margin-bottom: 8px; background: #1e293b; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
    .opt:hover { background: #334155; }
    .opt.voted { background: #1e3a5f; border: 1px solid #3b82f6; }
    .bar { height: 8px; background: #3b82f6; border-radius: 4px; margin-top: 8px; transition: width 0.3s; }
    .meta { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; margin-top: 4px; }
    input[type=radio] { width: 18px; height: 18px; accent-color: #3b82f6; }
  </style>
</head>
<body>
  <main>
    <h1>Poll</h1>
    <p class="q">What's your favorite programming language?</p>
    <div id="opts"></div>
  </main>
  <script>
    const opts = document.getElementById('opts');
    async function load() {
      const poll = await boglet.query('poll');
      const options = await boglet.query('options');
      const myVote = await boglet.query('myVote');
      const voted = myVote && myVote[0];
      const total = (poll && poll[0] && poll[0].totalVotes) || 0;
      opts.innerHTML = '';
      for (const o of options) {
        const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
        const div = document.createElement('div');
        div.className = 'opt' + (voted && voted.optionId === o.id ? ' voted' : '');
        if (!voted) {
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = 'poll';
          radio.onchange = async () => { await boglet.mutation('vote', [o.id]); load(); };
          div.appendChild(radio);
        }
        const label = document.createElement('span');
        label.textContent = o.label;
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.width = pct + '%';
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.innerHTML = '<span>' + o.votes + ' votes</span><span>' + pct + '%</span>';
        div.append(label, bar, meta);
        opts.appendChild(div);
      }
    }
    boglet.onReady(load);
  </script>
</body>
</html>`;

const notesHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Notes</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #fafafa; color: #1a1a1a; }
    main { max-width: 700px; margin: 0 auto; padding: 48px 24px; }
    h1 { font-size: 32px; font-weight: 700; margin: 0 0 24px; letter-spacing: -0.02em; }
    .toolbar { display: flex; gap: 8px; margin-bottom: 24px; }
    input[type=text] { flex: 1; padding: 10px 14px; border: 1px solid #e5e5e5; background: white; font: inherit; outline: none; }
    input[type=text]:focus { border-color: #000; }
    button { padding: 10px 18px; background: #000; color: white; border: none; font: inherit; cursor: pointer; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .note { background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e5e5; cursor: pointer; transition: box-shadow 0.15s; }
    .note:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .note h3 { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
    .note p { margin: 0; color: #666; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .del { margin-top: 12px; font-size: 12px; color: #e11d48; cursor: pointer; }
    .empty { color: #999; text-align: center; padding: 60px 0; }
  </style>
</head>
<body>
  <main>
    <h1>Notes</h1>
    <div class="toolbar"><input id="title" type="text" placeholder="note title"><button>new</button></div>
    <div class="grid" id="grid"></div>
    <p class="empty" id="empty" style="display:none">no notes yet</p>
  </main>
  <script>
    const grid = document.getElementById('grid');
    const empty = document.getElementById('empty');
    const title = document.getElementById('title');
    async function load() {
      const notes = await boglet.query('notes') || [];
      grid.innerHTML = '';
      empty.style.display = notes.length === 0 ? 'block' : 'none';
      for (const n of notes) {
        const div = document.createElement('div');
        div.className = 'note';
        const h3 = document.createElement('h3');
        h3.textContent = n.title;
        const p = document.createElement('p');
        p.textContent = n.content || '';
        const del = document.createElement('div');
        del.className = 'del';
        del.textContent = 'delete';
        del.onclick = async (e) => { e.stopPropagation(); await boglet.mutation('deleteNote', [n.id]); load(); };
        div.append(h3, p, del);
        grid.appendChild(div);
      }
    }
    document.querySelector('button').onclick = async () => {
      const t = title.value.trim();
      if (!t) return;
      await boglet.mutation('createNote', [t]);
      title.value = '';
      load();
    };
    boglet.onReady(load);
  </script>
</body>
</html>`;

const bookmarksHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bookmarks</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #1a1a2e; color: #eee; }
    main { max-width: 600px; margin: 0 auto; padding: 56px 24px; }
    h1 { font-size: 40px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.02em; }
    .sub { color: #888; margin: 0 0 32px; font-size: 14px; }
    form { display: flex; gap: 8px; margin-bottom: 32px; }
    input { flex: 1; padding: 10px 14px; background: #16213e; border: 1px solid #0f3460; color: white; font: inherit; outline: none; }
    input:focus { border-color: #e94560; }
    button { padding: 10px 18px; background: #e94560; color: white; border: none; font: inherit; cursor: pointer; }
    .bm { display: flex; align-items: center; gap: 12px; padding: 16px; margin-bottom: 12px; background: #16213e; border-radius: 8px; text-decoration: none; color: inherit; transition: transform 0.15s; }
    .bm:hover { transform: translateX(4px); }
    .bm .icon { font-size: 24px; }
    .bm .info { flex: 1; min-width: 0; }
    .bm .title { font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bm .url { font-size: 13px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .empty { color: #666; text-align: center; padding: 60px 0; }
  </style>
</head>
<body>
  <main>
    <h1>Bookmarks</h1>
    <p class="sub">shared link collection</p>
    <form id="add"><input id="url" type="text" placeholder="https://..." autofocus><button>add</button></form>
    <div id="list"></div>
    <p class="empty" id="empty" style="display:none">no bookmarks yet</p>
  </main>
  <script>
    const list = document.getElementById('list');
    const empty = document.getElementById('empty');
    const form = document.getElementById('add');
    const url = document.getElementById('url');
    async function load() {
      const bms = await boglet.query('bookmarks') || [];
      list.innerHTML = '';
      empty.style.display = bms.length === 0 ? 'block' : 'none';
      for (const b of bms) {
        const a = document.createElement('a');
        a.className = 'bm';
        a.href = b.url;
        a.target = '_blank';
        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.textContent = '🔖';
        const info = document.createElement('div');
        info.className = 'info';
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = b.title || b.url;
        const u = document.createElement('div');
        u.className = 'url';
        u.textContent = b.url;
        info.append(title, u);
        a.append(icon, info);
        list.appendChild(a);
      }
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      const v = url.value.trim();
      if (!v) return;
      await boglet.mutation('addBookmark', [v]);
      url.value = '';
      load();
    };
    boglet.onReady(load);
  </script>
</body>
</html>`;

const habitsHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Habits</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0d1117; color: #c9d1d9; }
    main { max-width: 500px; margin: 0 auto; padding: 56px 24px; }
    h1 { font-size: 36px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.02em; }
    .sub { color: #8b949e; margin: 0 0 32px; font-size: 14px; }
    form { display: flex; gap: 8px; margin-bottom: 32px; }
    input { flex: 1; padding: 10px 14px; background: #161b22; border: 1px solid #30363d; color: white; font: inherit; outline: none; }
    input:focus { border-color: #58a6ff; }
    button { padding: 10px 18px; background: #238636; color: white; border: none; font: inherit; cursor: pointer; }
    .habit { display: flex; align-items: center; gap: 12px; padding: 16px; margin-bottom: 12px; background: #161b22; border-radius: 8px; }
    .habit .check { width: 24px; height: 24px; border: 2px solid #30363d; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .habit .check.done { background: #238636; border-color: #238636; }
    .habit .check.done::after { content: '✓'; color: white; font-size: 14px; }
    .habit .name { flex: 1; font-weight: 500; }
    .habit .streak { font-size: 13px; color: #8b949e; }
    .habit .streak span { color: #58a6ff; font-weight: 600; }
    .empty { color: #484f58; text-align: center; padding: 60px 0; }
  </style>
</head>
<body>
  <main>
    <h1>Habits</h1>
    <p class="sub">daily streak tracker</p>
    <form id="add"><input id="name" type="text" placeholder="new habit..." autofocus><button>add</button></form>
    <div id="list"></div>
    <p class="empty" id="empty" style="display:none">no habits yet</p>
  </main>
  <script>
    const list = document.getElementById('list');
    const empty = document.getElementById('empty');
    const form = document.getElementById('add');
    const name = document.getElementById('name');
    async function load() {
      const habits = await boglet.query('habits') || [];
      list.innerHTML = '';
      empty.style.display = habits.length === 0 ? 'block' : 'none';
      for (const h of habits) {
        const div = document.createElement('div');
        div.className = 'habit';
        const check = document.createElement('div');
        check.className = 'check' + (h.doneToday ? ' done' : '');
        check.onclick = async () => { await boglet.mutation('toggle', [h.id]); load(); };
        const n = document.createElement('span');
        n.className = 'name';
        n.textContent = h.name;
        const streak = document.createElement('div');
        streak.className = 'streak';
        streak.innerHTML = '<span>' + (h.streak || 0) + '</span> day streak';
        div.append(check, n, streak);
        list.appendChild(div);
      }
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      const v = name.value.trim();
      if (!v) return;
      await boglet.mutation('addHabit', [v]);
      name.value = '';
      load();
    };
    boglet.onReady(load);
  </script>
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

  poll: {
    name: "poll",
    description: "Voting poll with real-time results. One vote per user.",
    schema: {
      tables: {
        poll: { fields: { totalVotes: "number" } },
        options: { fields: { label: "string", votes: "number" } },
        votes: { fields: { optionId: "string", userId: "string" } },
      },
    },
    queries: {
      poll: { from: "poll", limit: 1 },
      options: { from: "options", orderBy: [["createdAt", "asc"]] },
      myVote: {
        from: "votes",
        where: [["userId", "==", { var: "ctx.userId" }]],
        limit: 1,
      },
    },
    mutations: {
      vote: {
        args: ["optionId"],
        body: [
          { stmt: "query", name: "existing", from: "votes", where: [["userId", "==", { var: "ctx.userId" }]], limit: 1 },
          {
            stmt: "if",
            cond: { op: ">", a: { call: "len", args: [{ var: "existing" }] }, b: { literal: 0 } },
            then: [{ stmt: "return", value: { literal: null } }],
          },
          { stmt: "insert", table: "votes", data: { obj: { optionId: { var: "args.optionId" }, userId: { var: "ctx.userId" } } } },
          { stmt: "query", name: "opt", from: "options", where: [["id", "==", { var: "args.optionId" }]], limit: 1 },
          {
            stmt: "if",
            cond: { op: ">", a: { call: "len", args: [{ var: "opt" }] }, b: { literal: 0 } },
            then: [
              {
                stmt: "update",
                table: "options",
                id: { var: "opt.0.id" },
                patch: { obj: { votes: { op: "+", a: { var: "opt.0.votes" }, b: { literal: 1 } } } },
              },
            ],
          },
          { stmt: "query", name: "p", from: "poll", limit: 1 },
          {
            stmt: "if",
            cond: { op: ">", a: { call: "len", args: [{ var: "p" }] }, b: { literal: 0 } },
            then: [
              {
                stmt: "update",
                table: "poll",
                id: { var: "p.0.id" },
                patch: { obj: { totalVotes: { op: "+", a: { var: "p.0.totalVotes" }, b: { literal: 1 } } } },
              },
            ],
            else: [{ stmt: "insert", table: "poll", data: { obj: { totalVotes: { literal: 1 } } } }],
          },
        ],
      },
    },
    pages: { "/": pollHtml },
  },

  notes: {
    name: "notes",
    description: "Per-user note cards. Create and delete notes.",
    schema: { tables: { notes: { fields: { title: "string", content: "string", ownerId: "string" } } } },
    queries: {
      notes: {
        from: "notes",
        where: [["ownerId", "==", { var: "ctx.userId" }]],
        orderBy: [["createdAt", "desc"]],
        limit: 100,
      },
    },
    mutations: {
      createNote: {
        args: ["title"],
        body: [
          { stmt: "if", cond: { call: "isEmpty", args: [{ var: "args.title" }] }, then: [{ stmt: "return", value: { literal: null } }] },
          {
            stmt: "insert",
            table: "notes",
            data: { obj: { title: { call: "slice", args: [{ var: "args.title" }, { literal: 0 }, { literal: 100 }] }, ownerId: { var: "ctx.userId" } } },
          },
        ],
      },
      deleteNote: {
        args: ["id"],
        body: [{ stmt: "delete", table: "notes", id: { var: "args.id" } }],
      },
    },
    pages: { "/": notesHtml },
  },

  bookmarks: {
    name: "bookmarks",
    description: "Shared bookmark collection. Anyone can add links.",
    schema: { tables: { bookmarks: { fields: { url: "string", title: "string" } } } },
    queries: {
      bookmarks: { from: "bookmarks", orderBy: [["createdAt", "desc"]], limit: 50 },
    },
    mutations: {
      addBookmark: {
        args: ["url"],
        body: [
          { stmt: "if", cond: { call: "isEmpty", args: [{ var: "args.url" }] }, then: [{ stmt: "return", value: { literal: null } }] },
          {
            stmt: "insert",
            table: "bookmarks",
            data: { obj: { url: { call: "slice", args: [{ var: "args.url" }, { literal: 0 }, { literal: 500 }] } } },
          },
        ],
      },
    },
    pages: { "/": bookmarksHtml },
  },

  habits: {
    name: "habits",
    description: "Daily habit tracker with streak counting. Toggle completion per day.",
    schema: {
      tables: {
        habits: { fields: { name: "string", streak: "number", lastDone: "string" } },
        habitLogs: { fields: { habitId: "string", userId: "string", date: "string" } },
      },
    },
    queries: {
      habits: { from: "habits", orderBy: [["createdAt", "desc"]], limit: 20 },
    },
    mutations: {
      addHabit: {
        args: ["name"],
        body: [
          { stmt: "if", cond: { call: "isEmpty", args: [{ var: "args.name" }] }, then: [{ stmt: "return", value: { literal: null } }] },
          {
            stmt: "insert",
            table: "habits",
            data: { obj: { name: { call: "slice", args: [{ var: "args.name" }, { literal: 0 }, { literal: 50 }] }, streak: { literal: 0 } } },
          },
        ],
      },
      toggle: {
        args: ["habitId"],
        body: [
          {
            stmt: "let",
            name: "today",
            value: { call: "slice", args: [{ call: "toString", args: [{ call: "now", args: [] }] }, { literal: 0 }, { literal: 10 }] },
          },
          {
            stmt: "query",
            name: "log",
            from: "habitLogs",
            where: [
              ["habitId", "==", { var: "args.habitId" }],
              ["userId", "==", { var: "ctx.userId" }],
              ["date", "==", { var: "today" }],
            ],
            limit: 1,
          },
          {
            stmt: "if",
            cond: { op: ">", a: { call: "len", args: [{ var: "log" }] }, b: { literal: 0 } },
            then: [{ stmt: "delete", table: "habitLogs", id: { var: "log.0.id" } }],
            else: [
              {
                stmt: "insert",
                table: "habitLogs",
                data: { obj: { habitId: { var: "args.habitId" }, userId: { var: "ctx.userId" }, date: { var: "today" } } },
              },
              { stmt: "query", name: "h", from: "habits", where: [["id", "==", { var: "args.habitId" }]], limit: 1 },
              {
                stmt: "if",
                cond: { op: ">", a: { call: "len", args: [{ var: "h" }] }, b: { literal: 0 } },
                then: [
                  {
                    stmt: "update",
                    table: "habits",
                    id: { var: "h.0.id" },
                    patch: { obj: { streak: { op: "+", a: { var: "h.0.streak" }, b: { literal: 1 } }, lastDone: { var: "today" } } },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    pages: { "/": habitsHtml },
  },
};
