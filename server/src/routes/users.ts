import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/schema.js';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  active: number;
  created_at: string;
  updated_at: string;
}

// Get all users
router.get('/', (req: AuthRequest, res: Response) => {
  const users = db.prepare(`
    SELECT id, email, name, role, active, created_at, updated_at
    FROM users
    ORDER BY name
  `).all();

  res.json(users);
});

// Get single user
router.get('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const user = db.prepare(`
    SELECT id, email, name, role, active, created_at, updated_at
    FROM users WHERE id = ?
  `).get(id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

// Create user
router.post('/', async (req: AuthRequest, res: Response) => {
  const { email, name, password, role } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name, and password required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email already in use' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = db.prepare(`
    INSERT INTO users (email, name, password_hash, role)
    VALUES (?, ?, ?, ?)
  `).run(email, name, passwordHash, role || 'user');

  const user = db.prepare(`
    SELECT id, email, name, role, active, created_at, updated_at
    FROM users WHERE id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(user);
});

// Update user
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { email, name, role, active } = req.body;

  // Check email uniqueness if changed
  if (email) {
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }
  }

  db.prepare(`
    UPDATE users SET
      email = COALESCE(?, email),
      name = COALESCE(?, name),
      role = COALESCE(?, role),
      active = COALESCE(?, active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(email, name, role, active, id);

  const user = db.prepare(`
    SELECT id, email, name, role, active, created_at, updated_at
    FROM users WHERE id = ?
  `).get(id);

  res.json(user);
});

// Reset user password (admin only)
router.post('/:id/reset-password', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { new_password } = req.body;

  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const passwordHash = await bcrypt.hash(new_password, 10);

  db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(passwordHash, id);

  res.json({ message: 'Password reset successfully' });
});

export default router;
