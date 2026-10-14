const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { initializeDatabase } = require('./initDb');

async function seedDatabase() {
  try {
    console.log('Ensuring database schema is ready...');
    await initializeDatabase();

    console.log('Clearing old sample records (if any)...');
    await db.query('DELETE FROM enquiries;');
    await db.query('DELETE FROM users;');

    console.log('Seeding counselor accounts...');
    const saltRounds = 10;
    const defaultPasswordHash = await bcrypt.hash('password123', saltRounds);

    const user1Query = `
      INSERT INTO users (name, email, password, phone, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email;
    `;
    const user1 = (
      await db.query(user1Query, [
        'John Doe (Senior Counselor)',
        'john.counselor@company.com',
        defaultPasswordHash,
        '+1-555-0101',
        'counselor',
      ])
    ).rows[0];

    const user2 = (
      await db.query(user1Query, [
        'Sarah Smith (Admissions Counselor)',
        'sarah.counselor@company.com',
        defaultPasswordHash,
        '+1-555-0102',
        'counselor',
      ])
    ).rows[0];

    console.log(`Created Counselor 1: ${user1.name} (${user1.email})`);
    console.log(`Created Counselor 2: ${user2.name} (${user2.email})`);

    console.log('Seeding student enquiries...');

    // Public / Unclaimed Enquiries
    const unclaimedEnquiries = [
      {
        name: 'Alex Johnson',
        email: 'alex.j@example.com',
        phone: '+1-555-0201',
        courseInterest: 'Full Stack Web Development (MERN)',
        notes: 'Looking for a career transition from finance to software development.',
        source: 'online_form',
      },
      {
        name: 'Priya Sharma',
        email: 'priya.s@example.com',
        phone: '+91-98765-43210',
        courseInterest: 'Data Science & Machine Learning',
        notes: 'Interested in Python, Pandas, and deep learning modules.',
        source: 'counselor_shared',
      },
      {
        name: 'David Miller',
        email: 'david.m@example.com',
        phone: '+1-555-0203',
        courseInterest: 'DevOps & Cloud Engineering (AWS/Docker/K8s)',
        notes: 'Has 2 years sysadmin experience, wants hands-on cloud labs.',
        source: 'online_form',
      },
      {
        name: 'Sneha Patel',
        email: 'sneha.p@example.com',
        phone: '+91-98765-43211',
        courseInterest: 'UI/UX Design Masterclass',
        notes: 'Wants to build a portfolio with Figma and user research case studies.',
        source: 'online_form',
      },
      {
        name: 'Marcus Lee',
        email: 'marcus.lee@example.com',
        phone: '+1-555-0205',
        courseInterest: 'Cybersecurity Fundamentals',
        notes: 'Preparing for CompTIA Security+ certification.',
        source: 'counselor_shared',
      },
    ];

    for (const item of unclaimedEnquiries) {
      await db.query(
        `INSERT INTO enquiries (name, email, phone, course_interest, notes, source, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'UNCLAIMED');`,
        [item.name, item.email, item.phone, item.courseInterest, item.notes, item.source]
      );
    }

    // One pre-claimed enquiry by John Doe to show claimed private state
    await db.query(
      `INSERT INTO enquiries (name, email, phone, course_interest, notes, source, status, claimed_by, claimed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'CLAIMED', $7, NOW());`,
      [
        'Emily Clark',
        'emily.c@example.com',
        '+1-555-0209',
        'Full Stack Web Development (MERN)',
        'Spoke on phone, very eager to start batch next Monday.',
        'counselor_shared',
        user1.id,
      ]
    );

    console.log('Seeding completed successfully!');
    console.log('\nDefault credentials for testing:');
    console.log('Counselor 1: john.counselor@company.com / password123');
    console.log('Counselor 2: sarah.counselor@company.com / password123');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  }
}

seedDatabase();
