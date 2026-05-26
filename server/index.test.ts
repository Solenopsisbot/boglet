import { describe, it, expect } from "vitest";
import { parseManifestJson } from "./utils";

describe("server utilities", () => {
  describe("parseManifestJson", () => {
    it("parses valid manifest JSON", () => {
      const manifest = {
        name: "test",
        schema: { tables: {} },
        queries: {},
        mutations: {},
        pages: { "/": "<html></html>" },
      };
      const result = parseManifestJson(JSON.stringify(manifest));
      expect(result).toEqual(manifest);
    });

    it("returns null for invalid JSON", () => {
      const result = parseManifestJson("{ invalid json }");
      expect(result).toBeNull();
    });

    it("returns null for non-object JSON", () => {
      const result = parseManifestJson('"just a string"');
      expect(result).toBeNull();
    });

    it("returns null for array JSON", () => {
      const result = parseManifestJson("[]");
      expect(result).toBeNull();
    });

    it("parses manifest with complex DSL", () => {
      const manifest = {
        name: "todo",
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
            where: [["done", "==", { literal: false }]],
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
          "/": "<html><body>Todo app</body></html>",
        },
      };
      const result = parseManifestJson(JSON.stringify(manifest));
      expect(result).toEqual(manifest);
    });
  });
});
