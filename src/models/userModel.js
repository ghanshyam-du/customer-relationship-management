const db = require('../config/database');

class UserModel {
  /**
   * Create a new employee/counselor account
   */
  static async create({ name, email, password, phone = null, role = 'counselor' }) {
    const query = `
      INSERT INTO users (name, email, password, phone, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, phone, role, created_at;
    `;
    const values = [name, email.toLowerCase().trim(), password, phone, role];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  /**
   * Find a user by email (includes password for authentication)
   */
  static async findByEmail(email) {
    const query = `
      SELECT id, name, email, password, phone, role, created_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const { rows } = await db.query(query, [email.trim()]);
    return rows[0] || null;
  }

  /**
   * Find a user by primary key ID (excludes password)
   */
  static async findById(id) {
    const query = `
      SELECT id, name, email, phone, role, created_at
      FROM users
      WHERE id = $1;
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Check if an email is already registered
   */
  static async existsByEmail(email) {
    const query = `
      SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;
    `;
    const { rows } = await db.query(query, [email.trim()]);
    return rows.length > 0;
  }
}

module.exports = UserModel;
