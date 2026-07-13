import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL || "file:./data.db";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsLibsqlClient?: ReturnType<typeof createClient>;
};

const client =
  globalForDb.__arenaNextJsLibsqlClient ??
  createClient({
    url: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsLibsqlClient = client;
}

export const db = drizzle(client);
export { client };