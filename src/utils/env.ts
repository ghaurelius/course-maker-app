// src/utils/env.ts (use .js if not TS)
type AnyEnv = Record<string, string | boolean | undefined>;

function readVite(key: string): string | undefined {
  try {
    // Vite exposes import.meta.env
    const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) as AnyEnv | undefined;
    return env ? (env[key] as string | undefined) : undefined;
  } catch {
    return undefined;
  }
}

function readWebpack(key: string): string | undefined {
  try {
    // CRA/webpack exposes process.env
    const env = (typeof process !== 'undefined' && process.env) as AnyEnv | undefined;
    return env ? (env[key] as string | undefined) : undefined;
  } catch {
    return undefined;
  }
}

/** Read an env var from Vite or CRA; returns string or fallback. */
export function getEnv(key: string, fallback = ''): string {
  return (readVite(key) ?? readWebpack(key) ?? fallback) as string;
}

/** Feature-flag helper: coerces to boolean. */
export function getFlag(...keys: string[]): boolean {
  // Return true if any of the keys equals "true"
  for (const k of keys) {
    const v = getEnv(k, '').toString().trim().toLowerCase();
    if (v === 'true') return true;
  }
  return false;
}
