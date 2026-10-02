const { Client } = require('pg');
const assert = require('assert');

async function verify() {
  const connectionString = process.env.TEST_DATABASE_URL || 'postgres://automata:automata_password@127.0.0.1:5434/automata_restore_test';
  
  if (!connectionString.includes('restore_test')) {
    throw new Error('Safety check failed: connection string must contain "restore_test".');
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log('==> Connected to restore database:', connectionString);
  
  try {
    // 1. Verify migrations
    console.log('==> Verifying migrations exist...');
    const migrations = await client.query('SELECT * FROM automata_os_migrations');
    assert(migrations.rows.length > 0, 'No migrations found in automata_os_migrations');
    console.log(`    Found ${migrations.rows.length} migration(s).`);

    // 2. Verify representative data survived
    console.log('==> Verifying news_items data...');
    const items = await client.query('SELECT * FROM news_items ORDER BY id');
    assert(items.rows.length >= 2, 'Expected at least 2 seeded news items');
    const seed1 = items.rows.find(r => r.id === 'seed-1');
    assert(seed1, 'Expected seed-1 to exist');
    assert.strictEqual(seed1.title, 'AI Breakthrough');
    console.log(`    Found ${items.rows.length} news_items.`);

    console.log('==> Verifying notification_deliveries data...');
    const states = await client.query('SELECT * FROM notification_deliveries WHERE news_item_id = $1', ['seed-1']);
    assert(states.rows.length === 1, 'Expected 1 notification delivery for seed-1');
    assert.strictEqual(states.rows[0].channel, 'telegram');
    console.log(`    Found notification state for seed-1.`);

    console.log('==> Verification successful! Backup and restore preserved schema and data.');
  } finally {
    await client.end();
  }
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
