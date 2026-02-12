import { db, initializeDatabase } from './schema.js';
import bcrypt from 'bcrypt';

async function seed() {
  initializeDatabase();

  // Create admin user if not exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@esi.com');

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin@esi.com', passwordHash, 'Admin User', 'admin');
    console.log('Created admin user: admin@esi.com / admin123');
  } else {
    console.log('Admin user already exists');
  }

  // Create a sample regular user
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('user@esi.com');

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('user123', 10);
    db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run('user@esi.com', passwordHash, 'Sample User', 'user');
    console.log('Created sample user: user@esi.com / user123');
  } else {
    console.log('Sample user already exists');
  }

  console.log('Seed completed');
}

seed().catch(console.error);
