/* =============================================
   ZeroWaste – Middleware de Autenticación
   Archivo: backend/middleware/auth.middleware.js
   ============================================= */
'use strict';

const AuthService = require('../services/auth.service');

function extractToken (req) {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  if (req.query && req.query.token) return String(req.query.token);
  return null;
}

function requireAuth (req, res, next) {
  const token = extractToken(req);
  const payload = AuthService.verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      message: 'Debes iniciar sesión para realizar esta acción.'
    });
  }

  req.usuario = {
    id: Number(payload.sub),
    nombre: payload.nombre,
    email: payload.email,
    username: payload.username || null
  };

  next();
}

function optionalAuth (req, res, next) {
  const token = extractToken(req);
  const payload = AuthService.verifyToken(token);
  if (payload) {
    req.usuario = {
      id: Number(payload.sub),
      nombre: payload.nombre,
      email: payload.email,
      username: payload.username || null
    };
  }
  next();
}

module.exports = { requireAuth, optionalAuth, extractToken };
