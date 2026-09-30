const { Client } = require('pg');

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://automata:automata_password@127.0.0.1:5434/automata'
  });

  await client.connect();
  
  try {
    const res = await client.query('SELECT count(*) FROM news_items');
    if (parseInt(res.rows[0].count, 10) > 0) {
      console.log('Database already has data. Seed skipped.');
      return;
    }

    console.log('Inserting seed data...');
    await client.query(`
      INSERT INTO news_items (id, title, url, source, collected_at, category, validation_status)
      VALUES 
      ('seed-1', 'AI Breakthrough', 'https://example.com/ai', 'Test Source', NOW(), 'ai', 'valid'),
      ('seed-2', 'New Open Source Tool', 'https://example.com/tool', 'Test Source 2', NOW(), 'software', 'valid')
    `);

    await client.query(`
      INSERT INTO notification_deliveries (channel, news_item_id, sent_at)
      VALUES
      ('telegram', 'seed-1', NOW())
    `);

    console.log('Seed successful.');
  } finally {
    await client.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
