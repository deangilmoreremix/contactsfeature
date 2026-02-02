const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Load environment variables
  require('dotenv').config();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  // Extract connection details from Supabase URL
  const url = new URL(supabaseUrl);
  const host = `db.${url.host}`;
  const database = 'postgres';
  const password = supabaseKey;
  const user = 'postgres';

  const client = new Client({
    host,
    port: 5432,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();

    console.log('Running GPT-5.2 migration...');

    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'scripts', 'migrate-to-gpt-5.2.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    console.log('Executing migration SQL...');
    await client.query(migrationSQL);

    console.log('Migration completed successfully!');

    // Verify the migration
    console.log('Verifying migration results...');
    const result = await client.query(`
      SELECT model, COUNT(*) as agent_count
      FROM agent_metadata
      GROUP BY model
      ORDER BY model
    `);

    console.log('Agent models after migration:');
    result.rows.forEach(row => {
      console.log(`  ${row.model}: ${row.agent_count} agents`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();