import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, authenticate } from '../middleware/auth.js';
import { asyncHandler, httpError, serializeUser } from '../utils.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials({ name, email, password }) {
  if (!name || name.trim().length < 2) throw httpError(400, 'Name must be at least 2 characters');
  if (!email || !EMAIL_RE.test(email)) throw httpError(400, 'A valid email is required');
  if (!password || password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body ?? {};
    validateCredentials({ name, email, password });
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = role === 'host' ? 'host' : 'guest';

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) throw httpError(409, 'An account with that email already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(name.trim(), normalizedEmail, passwordHash, normalizedRole);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json({ token: signToken(user), user: serializeUser(user) });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) throw httpError(400, 'Email and password are required');

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!row) throw httpError(401, 'Invalid email or password');

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) throw httpError(401, 'Invalid email or password');

    res.json({ token: signToken(row), user: serializeUser(row) });
  })
);

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
