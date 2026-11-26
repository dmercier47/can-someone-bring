// Tiny migration runner (no Docker / Supabase CLI needed).
//   npm run db:migrate   → applies new files in supabase/migrations, in order
//   npm run db:seed      → (re)creates the demo sheet from supabase/seed.sql
// Reads DATABASE_URL from .env.local (loaded by `node --env-file`).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url || url.includes("YOUR-")) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1, onnotice: () => {} });
const root = path.resolve(import.meta.dirname, "..", "supabase");
const cmd = process.argv[2];

try {
  if (cmd === "migrate") {
    await sql`create table if not exists public._migrations (name text primary key, applied_at timestamptz default now())`;
    await sql`alter table public._migrations enable row level security`;
    const done = new Set((await sql`select name from public._migrations`).map((r) => r.name));
    const files = (await readdir(path.join(root, "migrations"))).filter((f) => f.endsWith(".sql")).sort();
    let applied = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      const body = await readFile(path.join(root, "migrations", file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`insert into public._migrations (name) values (${file})`;
      });
      console.log(`applied ${file}`);
      applied++;
    }
    console.log(applied ? `done (${applied} applied)` : "already up to date");
  } else if (cmd === "seed") {
    await sql.unsafe(await readFile(path.join(root, "seed.sql"), "utf8"));
    console.log("seeded demo sheet → /s/demo");
  } else {
    console.error("usage: node scripts/db.mjs <migrate|seed>");
    process.exitCode = 1;
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
