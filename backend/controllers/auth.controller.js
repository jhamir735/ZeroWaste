/* =============================================
   ZeroWaste – Autenticación Controller
   Archivo: backend/controllers/auth.controller.js
   ============================================= */
'use strict';

const db = require('../config/db');
const AuthService = require('../services/auth.service');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildSession (usuario) {
  const safeUser = AuthService.normalizeUser(usuario);
  return {
    token: AuthService.signToken(safeUser),
    usuario: safeUser
  };
}

// POST /api/auth/registro
exports.registro = async (req, res) => {
  try {
    const {
      nombre,
      email,
      username,
      usuario,
      password,
      confirmar_password
    } = req.body || {};

    const nombreLimpio = String(nombre || '').trim();
    const emailLimpio = String(email || '').trim().toLowerCase();
    let usernameLimpio = AuthService.sanitizeUsername(username || usuario);

    if (!nombreLimpio || nombreLimpio.length < 2) {
      return res.status(400).json({ success: false, message: 'Ingresa tu nombre (mínimo 2 caracteres).' });
    }
    if (!emailLimpio || !EMAIL_REGEX.test(emailLimpio)) {
      return res.status(400).json({ success: false, message: 'Ingresa un correo electrónico válido.' });
    }
    if (!usernameLimpio) {
      usernameLimpio = AuthService.usernameFromEmail(emailLimpio);
    }
    if (!usernameLimpio || usernameLimpio.length < 3) {
      return res.status(400).json({ success: false, message: 'El usuario debe tener al menos 3 caracteres.' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    if (confirmar_password !== undefined && String(confirmar_password) !== String(password)) {
      return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden.' });
    }

    const { rows: existentes } = await db.query(
      `SELECT id, email, username
         FROM usuarios
        WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)
        LIMIT 1`,
      [emailLimpio, usernameLimpio]
    );

    if (existentes.length > 0) {
      const conflicto = existentes[0];
      const mensaje = String(conflicto.email || '').toLowerCase() === emailLimpio
        ? 'Ya existe una cuenta con ese correo electrónico.'
        : 'Ese nombre de usuario ya está en uso.';
      return res.status(409).json({ success: false, message: mensaje });
    }

    const passwordHash = AuthService.hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO usuarios (nombre, email, username, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, username, fecha_registro`,
      [nombreLimpio, emailLimpio, usernameLimpio, passwordHash]
    );

    const sesion = buildSession(rows[0]);
    res.status(201).json({
      success: true,
      message: '¡Cuenta creada con éxito!',
      token: sesion.token,
      data: sesion.usuario
    });
  } catch (err) {
    console.error('Error en registro:', err);
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'El correo o el nombre de usuario ya están registrados.' });
    }
    res.status(500).json({ success: false, message: 'No se pudo crear la cuenta', error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { identifier, usuario, email, password } = req.body || {};
    const identificador = String(identifier || usuario || email || '').trim();

    if (!identificador || !password) {
      return res.status(400).json({ success: false, message: 'Ingresa tu usuario o correo y tu contraseña.' });
    }

    const { rows } = await db.query(
      `SELECT id, nombre, email, username, password_hash, fecha_registro
         FROM usuarios
        WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
        LIMIT 1`,
      [identificador]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }

    const usuarioEncontrado = rows[0];
    if (!AuthService.verifyPassword(password, usuarioEncontrado.password_hash)) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }

    const sesion = buildSession(usuarioEncontrado);
    res.json({
      success: true,
      message: 'Bienvenido de nuevo',
      token: sesion.token,
      data: sesion.usuario
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ success: false, message: 'No se pudo iniciar sesión', error: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nombre, email, username, fecha_registro FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: AuthService.normalizeUser(rows[0]) });
  } catch (err) {
    console.error('Error en me:', err);
    res.status(500).json({ success: false, message: 'No se pudo consultar la sesión', error: err.message });
  }
};

// PUT /api/auth/password
exports.cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body || {};

    if (!password_actual || !password_nuevo) {
      return res.status(400).json({ success: false, message: 'Completa tu contraseña actual y la nueva.' });
    }
    if (String(password_nuevo).length < 6) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const { rows } = await db.query(
      'SELECT id, password_hash FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    if (!AuthService.verifyPassword(password_actual, rows[0].password_hash)) {
      return res.status(401).json({ success: false, message: 'La contraseña actual no es correcta.' });
    }

    const nuevoHash = AuthService.hashPassword(password_nuevo);
    await db.query(
      'UPDATE usuarios SET password_hash = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2',
      [nuevoHash, req.usuario.id]
    );

    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error('Error en cambiarPassword:', err);
    res.status(500).json({ success: false, message: 'No se pudo cambiar la contraseña', error: err.message });
  }
};
