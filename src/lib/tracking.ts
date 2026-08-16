/* Captura dos parâmetros de origem (src, sck e UTMs) enviados pelo site. */

export const TRACK_KEYS = [
  "src",
  "sck",
  "utm_source",
  "utm_campaign",
  "utm_medium",
  "utm_content",
  "utm_term",
] as const;

export function trackingFrom(body: Record<string, unknown>): Record<string, string> {
  const nested = (body["tracking"] ?? {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of TRACK_KEYS) {
    const v = body[k] ?? nested[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 300);
  }
  return out;
}
