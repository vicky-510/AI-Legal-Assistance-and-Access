import crypto from 'crypto';
import { Router } from 'express';
import User from '../models/User.js';
import Contract from '../models/Contract.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Generates a strong random password: 16 chars drawn from a mixed
// alphanumeric+symbol set, via crypto.randomInt (CSPRNG, not Math.random).
function generateStrongPassword(length = 16) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += charset[crypto.randomInt(charset.length)];
  }
  return password;
}

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users: users.map((u) => u.toSafeObject()) });
  })
);

router.patch(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role must be "user" or "admin".' });
    }
    if (req.params.id === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot demote your own account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.role = role;
    await user.save();
    res.json({ user: user.toSafeObject() });
  })
);

// Revoke all active sessions for a user by bumping tokenVersion —
// every existing JWT for them fails the tokenVersion check on next request.
router.post(
  '/users/:id/revoke',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.tokenVersion += 1;
    await user.save();
    res.json({ success: true });
  })
);

// Resets a user's password to a freshly generated strong random value and
// returns it once (it is never stored in plaintext or logged) — also
// revokes existing sessions since the credential just changed under them.
router.post(
  '/users/:id/reset-password',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const newPassword = generateStrongPassword();
    await user.setPassword(newPassword);
    user.tokenVersion += 1;
    await user.save();

    res.json({ email: user.email, newPassword });
  })
);

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await Contract.deleteMany({ owner: user._id });
    res.json({ success: true });
  })
);

router.get(
  '/documents',
  asyncHandler(async (req, res) => {
    const contracts = await Contract.find()
      .select('-fullText -chunks')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });
    res.json({ contracts });
  })
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const [userCount, adminCount, documentCount] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'admin' }),
      Contract.countDocuments(),
    ]);
    res.json({ userCount, adminCount, documentCount });
  })
);

export default router;
