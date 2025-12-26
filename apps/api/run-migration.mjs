import fs from 'fs';
import path from 'path';
import pg from 'pg';

// Load env
const envPath = path.join(import.meta.dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq > 0) {
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  // Add delete fields
  await pool.query(`
    ALTER TABLE "messaging_messages"
    ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT,
    ADD COLUMN IF NOT EXISTS "deleted_for_everyone" BOOLEAN NOT NULL DEFAULT true;
  `);
  console.log('✓ Delete fields added');

  // Add edit fields
  await pool.query(`
    ALTER TABLE "messaging_messages"
    ADD COLUMN IF NOT EXISTS "edited_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "edited_by_id" TEXT;
  `);
  console.log('✓ Edit fields added');

  // Add reactions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "messaging_reactions" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "org_id" UUID NOT NULL REFERENCES "organizations"("id"),
      "thread_id" UUID NOT NULL REFERENCES "messaging_threads"("id"),
      "message_id" UUID NOT NULL REFERENCES "messaging_messages"("id"),
      "user_id" TEXT NOT NULL,
      "emoji" TEXT NOT NULL,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
      UNIQUE("message_id", "user_id", "emoji")
    );
    CREATE INDEX IF NOT EXISTS "idx_messaging_reactions_message" ON "messaging_reactions"("message_id");
  `);
  console.log('✓ Reactions table created');

  // Verify
  const result = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'messaging_messages'
    AND column_name IN ('deleted_at', 'deleted_by_id', 'deleted_for_everyone', 'edited_at', 'edited_by_id')
  `);
  console.log('✓ Verified columns:', result.rows.map(r => r.column_name).join(', '));

  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_name = 'messaging_reactions'
  `);
  console.log('✓ Verified reactions table:', tables.rows.length > 0 ? 'exists' : 'missing');

} catch (e) {
  console.error('Migration error:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}

console.log('\n✓ All migrations completed successfully!');
