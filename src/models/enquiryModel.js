const db = require('../config/database');

class EnquiryModel {
  /**
   * Create a new public enquiry submitted through public form or shared link
   */
  static async create({ name, email, phone, courseInterest, notes = null, source = 'online_form' }) {
    const query = `
      INSERT INTO enquiries (name, email, phone, course_interest, notes, source, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'UNCLAIMED')
      RETURNING id, name, email, phone, course_interest, notes, source, status, created_at;
    `;
    const values = [name.trim(), email.toLowerCase().trim(), phone.trim(), courseInterest.trim(), notes, source];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  /**
   * Find a specific enquiry by ID
   */
  static async findById(id) {
    const query = `
      SELECT 
        e.id, e.name, e.email, e.phone, e.course_interest, e.notes, e.source,
        e.status, e.claimed_by, e.claimed_at, e.created_at, e.updated_at,
        u.name AS counselor_name, u.email AS counselor_email
      FROM enquiries e
      LEFT JOIN users u ON e.claimed_by = u.id
      WHERE e.id = $1;
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Fetch all public/unclaimed enquiries (visible to all counselors)
   * Supports search, filter by course, and pagination
   */
  static async findUnclaimed({ page = 1, limit = 10, search = '', course = '' }) {
    const offset = (page - 1) * limit;
    const conditions = ['claimed_by IS NULL'];
    const values = [];

    if (course) {
      values.push(`%${course.trim()}%`);
      conditions.push(`course_interest ILIKE $${values.length}`);
    }

    if (search) {
      values.push(`%${search.trim()}%`);
      const searchIndex = values.length;
      conditions.push(`(name ILIKE $${searchIndex} OR email ILIKE $${searchIndex} OR phone ILIKE $${searchIndex})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM enquiries ${whereClause};`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch paginated data
    values.push(limit);
    const limitIndex = values.length;
    values.push(offset);
    const offsetIndex = values.length;

    const selectQuery = `
      SELECT id, name, email, phone, course_interest, notes, source, status, created_at
      FROM enquiries
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex};
    `;

    const { rows } = await db.query(selectQuery, values);

    return {
      enquiries: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Concurrency-safe atomic claim of an enquiry
   * Ensures only one counselor can claim an enquiry even under simultaneous requests
   */
  static async claim(enquiryId, counselorId) {
    const query = `
      UPDATE enquiries
      SET 
        claimed_by = $1,
        claimed_at = CURRENT_TIMESTAMP,
        status = 'CLAIMED',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND claimed_by IS NULL
      RETURNING id, name, email, phone, course_interest, notes, source, status, claimed_by, claimed_at;
    `;
    const { rows } = await db.query(query, [counselorId, enquiryId]);
    return rows[0] || null;
  }

  /**
   * Fetch all enquiries claimed by a specific counselor
   */
  static async findClaimedByCounselor(counselorId, { page = 1, limit = 10, search = '', status = '' }) {
    const offset = (page - 1) * limit;
    const conditions = ['claimed_by = $1'];
    const values = [counselorId];

    if (status) {
      values.push(status.trim().toUpperCase());
      conditions.push(`status = $${values.length}`);
    }

    if (search) {
      values.push(`%${search.trim()}%`);
      const searchIndex = values.length;
      conditions.push(`(name ILIKE $${searchIndex} OR email ILIKE $${searchIndex} OR phone ILIKE $${searchIndex} OR course_interest ILIKE $${searchIndex})`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total count
    const countQuery = `SELECT COUNT(*) FROM enquiries ${whereClause};`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch paginated
    values.push(limit);
    const limitIndex = values.length;
    values.push(offset);
    const offsetIndex = values.length;

    const selectQuery = `
      SELECT id, name, email, phone, course_interest, notes, source, status, claimed_at, created_at, updated_at
      FROM enquiries
      ${whereClause}
      ORDER BY claimed_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex};
    `;

    const { rows } = await db.query(selectQuery, values);

    return {
      enquiries: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Update status/notes for a claimed enquiry by the assigned counselor
   */
  static async updateStatus(enquiryId, counselorId, { status, notes }) {
    const query = `
      UPDATE enquiries
      SET 
        status = COALESCE($1, status),
        notes = COALESCE($2, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND claimed_by = $4
      RETURNING id, name, email, phone, course_interest, notes, status, claimed_at, updated_at;
    `;
    const { rows } = await db.query(query, [status, notes, enquiryId, counselorId]);
    return rows[0] || null;
  }
}

module.exports = EnquiryModel;
