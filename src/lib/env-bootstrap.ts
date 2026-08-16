// Fills server-side process.env defaults so the app runs on any host
// (Vercel, custom domains, etc.) without extra configuration.
// Only PUBLIC values are inlined here (Supabase URL + publishable key).
import {
  PUBLIC_SUPABASE_PROJECT_ID,
  PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PUBLIC_SUPABASE_URL,
} from "./public-config";

const publicDefaults: Record<string, string | undefined> = {
  SUPABASE_URL: import.meta.env['VITE_SUPABASE_URL'] || PUBLIC_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY:
    import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_PROJECT_ID:
    import.meta.env['VITE_SUPABASE_PROJECT_ID'] || PUBLIC_SUPABASE_PROJECT_ID,
};

export function bootstrapServerEnv(): void {
  if (typeof process === 'undefined' || !process.env) return;
  for (const [key, value] of Object.entries(publicDefaults)) {
    if (value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
