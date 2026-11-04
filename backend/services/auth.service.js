/* =============================================
   ZeroWaste – Servicio de Autenticación
   Archivo: backend/services/auth.service.js
   Hash de contraseñas con scrypt y tokens HMAC
   sin dependencias externas.
   ============================================= */
'use strict';

const crypto = require('crypto');

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días
const SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'zerowaste-dev-secret-cambia-esto';

/* ---------- Contraseñas ---------- */
function hashPassword (password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword (password, storedHash) {
  if (!password || !storedHash) return false;

  const parts = String(storedHash).split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const salt = parts[1];
  const expected = Buffer.from(parts[2], 'hex');
  const derived = crypto.scryptSync(String(password), salt, expected.length || 64);

  if (expected.length !== derived.length) return false;
  return crypto.timingSafeEqual(expected, derived);
}

/* ---------- Tokens firmados (similar a JWT HS256) ---------- */
function base64url (input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url (input) {
  const normalized = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function signToken (usuario) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: Number(usuario.id),
    nombre: usuario.nombre,
    email: usuario.email,
    username: usuario.username || null,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  };

  const body = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(body)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${body}.${signature}`;
}

function verifyToken (token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(body)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const providedBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(fromBase64url(body));
    const now = Math.floor(Date.now() / 1000);
    if (!payload || !payload.sub || !payload.exp || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ---------- Utilidades para usuarios ---------- */
function normalizeUser (row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    username: row.username || null,
    fecha_registro: row.fecha_registro || null
  };
}

function sanitizeUsername (value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 50);
}

function usernameFromEmail (email) {
  return sanitizeUsername(String(email || '').split('@')[0]);
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  normalizeUser,
  sanitizeUsername,
  usernameFromEmail,
  TOKEN_TTL_SECONDS
};
