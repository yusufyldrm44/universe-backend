const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true
});

pool.on('connect', () => {
  console.log('PostgreSQL bağlantısı kuruldu');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool hatası (uygulama çalışmaya devam ediyor):', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
