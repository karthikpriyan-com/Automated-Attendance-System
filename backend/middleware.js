// JWT authentication + role-based access control
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'change-this-secret-before-deploying';
if (!process.env.JWT_SECRET) console.warn('Warning: JWT_SECRET is not set. Using an insecure default.');

const sign = user => jwt.sign(user, SECRET, { expiresIn: '8h' });

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Log in to continue' });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: 'Your session expired. Log in again.' }); }
}

const role = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You are not allowed to do this' });

module.exports = { sign, auth, role };
