import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['Admin', 'Estimator', 'Viewer'])
});

router.post('/register', requireAuth, requireRole(['Admin']), async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: result.error.flatten() });
  }
  const { name, email, password, role } = result.data;
  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (:name, :email, :password_hash, :role, NOW())',
    { name, email, password_hash: passwordHash, role }
  );
  return res.status(201).json({ message: 'User created' });
});

router.post('/bootstrap', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: result.error.flatten() });
  }
  const existing = await query<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if ((existing[0]?.count ?? 0) > 0) {
    return res.status(400).json({ message: 'Bootstrap already completed' });
  }
  const { name, email, password, role } = result.data;
  if (role !== 'Admin') {
    return res.status(400).json({ message: 'Bootstrap user must be Admin' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (:name, :email, :password_hash, :role, NOW())',
    { name, email, password_hash: passwordHash, role }
  );
  return res.status(201).json({ message: 'Bootstrap admin created' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  const users = await query<{ id: number; email: string; password_hash: string; role: 'Admin' | 'Estimator' | 'Viewer' }>(
    'SELECT id, email, password_hash, role FROM users WHERE email = :email',
    { email }
  );
  const user = users[0];
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: '8h'
  });
  return res.json({ token });
});

export default router;
