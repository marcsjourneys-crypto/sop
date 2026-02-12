import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Get all settings (any authenticated user can read)
router.get('/', (req: AuthRequest, res: Response) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj: Record<string, string> = {};
  (settings as { key: string; value: string }[]).forEach(s => {
    settingsObj[s.key] = s.value;
  });
  res.json(settingsObj);
});

// Update settings (admin only)
router.put('/', requireAdmin, (req: AuthRequest, res: Response) => {
  const settings = req.body;

  const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  for (const [key, value] of Object.entries(settings)) {
    updateStmt.run(key, String(value));
  }

  const allSettings = db.prepare('SELECT * FROM settings').all();
  const settingsObj: Record<string, string> = {};
  (allSettings as { key: string; value: string }[]).forEach(s => {
    settingsObj[s.key] = s.value;
  });

  res.json(settingsObj);
});

export default router;
