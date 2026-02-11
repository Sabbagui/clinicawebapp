const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'gynecology_practice',
  user: 'postgres',
  password: 'postgres',
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL!');

    const res = await client.query('SELECT NOW()');
    console.log('Current time:', res.rows[0]);

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

testConnection();
