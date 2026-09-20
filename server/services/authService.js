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
  const isProd = env.nodeEnv === 'production';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    // Frontend and backend are deployed on separate domains in production
    // (e.g. two Vercel projects), so the cookie must be sent cross-site.
    // sameSite: 'none' requires secure: true, which is fine since
    // production is always served over HTTPS.
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  const isProd = env.nodeEnv === 'production';
  // clearCookie must be called with the same attributes the cookie was set
  // with (secure/sameSite) or some browsers won't actually delete it.
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
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
