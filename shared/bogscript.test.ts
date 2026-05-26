import { describe, expect, it } from "vitest";
import { bogScriptToManifest, manifestToBogScript } from "./bogscript";
import { TEMPLATES } from "./templates";

describe("bogscript", () => {
  it("generates a manifest from readable pseudo-script", () => {
    const result = bogScriptToManifest(`
app "tiny"
description "made in the IDE"
table todos text:string done:boolean ownerId:string
query todos from todos where [["ownerId","==",{"var":"ctx.userId"}]] order createdAt desc limit 20
mutation addTodo(text)
  insert todos {"text":{"var":"args.text"},"done":false,"ownerId":{"var":"ctx.userId"}}
end
`, { "/": "<html><body>Tiny</body></html>" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.manifest.name).toBe("tiny");
    expect(result.manifest.schema.tables.todos.fields.done).toBe("boolean");
    expect(result.manifest.queries.todos.limit).toBe(20);
    expect(result.manifest.mutations.addTodo.body[0].stmt).toBe("insert");
    expect(result.manifest.pages["/"]).toContain("Tiny");
  });

  it("round-trips template structure without owning page HTML", () => {
    const script = manifestToBogScript(TEMPLATES.todo);
    const result = bogScriptToManifest(script, TEMPLATES.todo.pages);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.manifest.name).toBe(TEMPLATES.todo.name);
    expect(Object.keys(result.manifest.schema.tables)).toEqual(Object.keys(TEMPLATES.todo.schema.tables));
    expect(Object.keys(result.manifest.queries)).toEqual(Object.keys(TEMPLATES.todo.queries));
    expect(Object.keys(result.manifest.mutations)).toEqual(Object.keys(TEMPLATES.todo.mutations));
    expect(result.manifest.pages).toEqual(TEMPLATES.todo.pages);
  });

  it("reports script parse failures", () => {
    const result = bogScriptToManifest("query missing-table");
    expect(result.ok).toBe(false);
  });
});
