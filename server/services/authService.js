import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, tv: user.tokenVersion },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export const AUTH_COOKIE_NAME = 'lexiclear_token';

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME);
}

/**
 * Ensures a bootstrap admin exists based on ADMIN_EMAIL/ADMIN_PASSWORD env vars.
 * Idempotent — safe to call on every server start.
 */
export async function ensureBootstrapAdmin() {
  if (!env.adminEmail || !env.adminPassword) {
    console.warn('[authService] ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin bootstrap.');
    return;
  }

  const existing = await User.findOne({ email: env.adminEmail.toLowerCase() });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`[authService] Promoted existing user ${existing.email} to admin.`);
    }
    return;
  }

  const admin = new User({ name: 'Admin', email: env.adminEmail.toLowerCase(), role: 'admin' });
  await admin.setPassword(env.adminPassword);
  await admin.save();
  console.log(`[authService] Bootstrap admin created: ${admin.email}`);
}
