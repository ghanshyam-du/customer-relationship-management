const { Pool } = require('pg');
const config = require('./env');

// Configure connection pool for PostgreSQL
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  max: 20, // max number of connection clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = {
  pool,
  // Helper function to execute queries with logging in development
  query: (text, params) => pool.query(text, params),
};
