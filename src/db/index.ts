import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy initialization: the connection is only created when first used,
// not at module import time. This prevents build-time crashes when
// DATABASE_URL is not set in the build environment (e.g. Vercel CI).
function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
      "Please add it in your Vercel project settings under Settings → Environment Variables."
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof getDb> | null = null;

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    if (!_db) _db = getDb();
    return (_db as Record<string | symbol, unknown>)[prop];
  },
});
