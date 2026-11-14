import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db.js';
import { httpError, serializeUser } from '../utils.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function readUserFromRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw httpError(401, 'Invalid or expired token');
  }
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
  if (!row) throw httpError(401, 'User no longer exists');
  return serializeUser(row);
}

export function authenticate(req, _res, next) {
  try {
    const user = readUserFromRequest(req);
    if (!user) throw httpError(401, 'Authentication required');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuth(req, _res, next) {
  try {
    req.user = readUserFromRequest(req);
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(httpError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(httpError(403, `Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}
