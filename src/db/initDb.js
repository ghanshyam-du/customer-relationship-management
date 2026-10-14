const db = require('../config/database');

/**
 * Initializes the database tables and indexes automatically on server startup.
 */
async function initializeDatabase() {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      role VARCHAR(50) DEFAULT 'counselor',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createEnquiriesTableQuery = `
    CREATE TABLE IF NOT EXISTS enquiries (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      course_interest VARCHAR(100) NOT NULL,
      notes TEXT,
      source VARCHAR(50) DEFAULT 'online_form',
      status VARCHAR(50) DEFAULT 'UNCLAIMED',
      claimed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      claimed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
    CREATE INDEX IF NOT EXISTS idx_enquiries_claimed_by ON enquiries(claimed_by);
    CREATE INDEX IF NOT EXISTS idx_enquiries_course ON enquiries(course_interest);
    CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at DESC);
  `;

  try {
    await db.query(createUsersTableQuery);
    await db.query(createEnquiriesTableQuery);
    await db.query(createIndexesQuery);
    console.log('Database tables and indexes verified successfully.');
  } catch (error) {
    console.error('Error initializing database tables:', error.message);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
};
