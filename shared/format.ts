// Small pure helpers shared by client and server (no DOM, no Node).

export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isValidSlug(s: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,47}$/.test(s);
}

export function formatTimeAgo(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!then) return "";
  const sec = Math.floor((Date.now() - then) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return sec + "s ago";
  if (sec < 3600) return Math.floor(sec / 60) + "m ago";
  if (sec < 86400) return Math.floor(sec / 3600) + "h ago";
  return Math.floor(sec / 86400) + "d ago";
}

export function formatBytes(n: number): string {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

export function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

// Tiny "obfuscation" for the secrets vault. Not real security — it's theater.
// We just want secret values to not be plaintext in db dumps.
export function obfuscate(value: string, key: string): string {
  if (!value) return "";
  let out = "";
  for (let i = 0; i < value.length; i++) {
    out += String.fromCharCode(value.charCodeAt(i) ^ key.charCodeAt(i % key.length || 1));
  }
  // base64-ish encoding using btoa-compatible logic without btoa.
  return Array.from(out).map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}

export function deobfuscate(encoded: string, key: string): string {
  if (!encoded) return "";
  let raw = "";
  for (let i = 0; i < encoded.length; i += 2) {
    raw += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16));
  }
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    out += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length || 1));
  }
  return out;
}

export function pickRegion(seed: string): string {
  const regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-2", "ap-northeast-1"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return regions[h % regions.length];
}
