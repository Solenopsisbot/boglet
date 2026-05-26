import { validateManifest, type Manifest } from "../shared/dsl";

export function parseManifestJson(s: string): Manifest | null {
  try {
    const parsed = JSON.parse(s);
    const v = validateManifest(parsed);
    return v.ok ? v.manifest : null;
  } catch {
    return null;
  }
}

export function lakebedInsertId(result: unknown, label = "insert result"): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "id" in result) {
    const id = (result as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  throw new Error("Expected " + label + " to include a string id");
}
