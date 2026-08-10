import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import pool from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export function signToken(profile) {
  return jwt.sign(
    { id: profile.id, email: profile.email, role: profile.role, is_admin: profile.is_admin },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const decoded = verifyToken(header.slice(7));
  if (!decoded) {
    req.user = null;
    return next();
  }
  const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [decoded.id]);
  req.user = rows[0] || null;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

export async function signUp(email, password, fullName, role) {
  const [existing] = await pool.query('SELECT id FROM profiles WHERE email = ?', [email]);
  if (existing.length) return { error: 'An account with this email already exists' };

  const [allProfiles] = await pool.query('SELECT COUNT(*) as cnt FROM profiles');
  const isFirst = allProfiles[0].cnt === 0;
  const isAdmin = isFirst;
  const finalRole = isFirst ? 'admin' : role;

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    'INSERT INTO profiles (id, email, password_hash, full_name, role, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
    [id, email, passwordHash, fullName, finalRole, isAdmin ? 1 : 0],
  );

  const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [id]);
  const profile = rows[0];
  const token = signToken(profile);
  return { token, profile };
}

export async function signIn(email, password) {
  const [rows] = await pool.query('SELECT * FROM profiles WHERE email = ?', [email]);
  if (!rows.length) return { error: 'No account found with this email' };
  const profile = rows[0];
  const valid = await bcrypt.compare(password, profile.password_hash);
  if (!valid) return { error: 'Incorrect password' };
  const token = signToken(profile);
  return { token, profile };
}
