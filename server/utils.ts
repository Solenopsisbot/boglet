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
