import { describe, it, expect } from "vitest";
import { validateManifest, type Manifest } from "./dsl";

describe("dsl validation", () => {
  const validManifest: Manifest = {
    name: "test",
    description: "test app",
    schema: {
      tables: {
        todos: {
          fields: {
            text: "string",
            done: "boolean",
          },
        },
      },
    },
    queries: {
      todos: {
        from: "todos",
        limit: 10,
      },
    },
    mutations: {
      addTodo: {
        args: ["text"],
        body: [
          {
            stmt: "insert",
            table: "todos",
            data: {
              obj: {
                text: { var: "args.text" },
                done: { literal: false },
              },
            },
          },
        ],
      },
    },
    pages: {
      "/": "<html><body>test</body></html>",
    },
  };

  it("accepts valid manifest", () => {
    const result = validateManifest(validManifest);
    expect(result.ok).toBe(true);
    expect(result.manifest).toEqual(validManifest);
  });

  it("accepts manifest with any field type (validation is minimal)", () => {
    const manifest = {
      ...validManifest,
      schema: {
        tables: {
          todos: {
            fields: {
              text: "invalid_type" as const,
            },
          },
        },
      },
    };
    const result = validateManifest(manifest);
    // validateManifest only checks structure, not field type validity
    expect(result.ok).toBe(true);
  });

  it("rejects manifest with missing required fields", () => {
    const invalid = { name: "test" } as Manifest;
    const result = validateManifest(invalid);
    expect(result.ok).toBe(false);
  });

  it("accepts manifest with any query (validation is minimal)", () => {
    const manifest = {
      ...validManifest,
      queries: {
        todos: {
          from: "nonexistent",
          limit: 10,
        },
      },
    };
    const result = validateManifest(manifest);
    // validateManifest only checks structure, not query validity
    expect(result.ok).toBe(true);
  });

  it("accepts manifest with empty schema", () => {
    const emptySchema: Manifest = {
      name: "test",
      description: "test",
      schema: { tables: {} },
      queries: {},
      mutations: {},
      pages: { "/": "<html><body>test</body></html>" },
    };
    const result = validateManifest(emptySchema);
    expect(result.ok).toBe(true);
  });
});
