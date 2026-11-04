/* =============================================
   ZeroWaste – Migración de Autenticación e Historial
   Archivo: backend/migrate_auth.js
   Ejecuta cambios idempotentes para:
   - usuario + contraseña
   - historial de alimentos consumidos
   - columnas extra del historial de recetas
   ============================================= */
'use strict';

const db = require('./config/db');
const AuthService = require('./services/auth.service');

const DEMO_PASSWORD = 'zerowaste123';
const DEMO_USERS = {
  'maria@correo.com': 'maria',
  'carlos.m@correo.com': 'carlos',
  'ana.torres@correo.com': 'ana'
};

async function ensureColumns () {
  await db.query(`
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username VARCHAR(50);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE recetas_cocinadas ADD COLUMN IF NOT EXISTS receta_nombre VARCHAR(200);
    ALTER TABLE recetas_cocinadas ADD COLUMN IF NOT EXISTS receta_id_externo VARCHAR(100);
  `);
}

async function ensureConsumedTable () {
  await db.query(`
    CREATE TABLE IF NOT EXISTS alimentos_consumidos (
      id SERIAL PRIMARY KEY,
      usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      alimento_id INT,
      nombre VARCHAR(120) NOT NULL,
      categoria VARCHAR(50) DEFAULT 'otros',
      cantidad INT NOT NULL DEFAULT 1,
      ubicacion VARCHAR(50) DEFAULT 'despensa',
      fecha_vencimiento DATE,
      notas TEXT,
      imagen TEXT,
      color VARCHAR(20) DEFAULT '#1E7A46',
      inicial VARCHAR(5) DEFAULT 'A',
      motivo VARCHAR(20) NOT NULL DEFAULT 'consumido',
      fecha_consumo TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_consumidos_usuario ON alimentos_consumidos(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_consumidos_fecha ON alimentos_consumidos(fecha_consumo DESC);
  `);
}

async function ensureDemoUsers () {
  const { rows: usuarios } = await db.query(
    'SELECT id, nombre, email, username, password_hash FROM usuarios ORDER BY id ASC'
  );

  for (const usuario of usuarios) {
    let username = AuthService.sanitizeUsername(usuario.username);

    if (!username) {
      username = AuthService.usernameFromEmail(usuario.email);
    }
    if (!username) {
      username = AuthService.sanitizeUsername(usuario.nombre).replace(/\s+/g, '.');
    }
    if (!username) {
      username = 'usuario' + usuario.id;
    }

    // Garantizar unicidad (reservando espacio para el sufijo)
    const baseUsername = username.slice(0, 42);
    let candidate = baseUsername;
    let suffix = 0;
    while (true) {
      const { rows: existentes } = await db.query(
        'SELECT id FROM usuarios WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1',
        [candidate, usuario.id]
      );
      if (existentes.length === 0) break;
      suffix += 1;
      candidate = `${baseUsername}${suffix}`.slice(0, 50);
    }

    const passwordHash = usuario.password_hash || AuthService.hashPassword(DEMO_PASSWORD);

    await db.query(
      `UPDATE usuarios
         SET username = $1,
             password_hash = $2,
             fecha_actualizacion = COALESCE(fecha_actualizacion, CURRENT_TIMESTAMP)
       WHERE id = $3`,
      [candidate, passwordHash, usuario.id]
    );

    const demoUsername = DEMO_USERS[String(usuario.email || '').toLowerCase()];
    if (demoUsername && candidate !== demoUsername) {
      // Mantener los accesos demo indicados en la pantalla de bienvenida.
      const { rows: conflictos } = await db.query(
        'SELECT id FROM usuarios WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1',
        [demoUsername, usuario.id]
      );
      if (conflictos.length === 0) {
        await db.query('UPDATE usuarios SET username = $1 WHERE id = $2', [demoUsername, usuario.id]);
      }
    }
  }

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_username_lower
      ON usuarios (LOWER(username));
  `);
}

async function runMigration (options = {}) {
  const silent = !!options.silent;
  try {
    await ensureColumns();
    await ensureConsumedTable();
    await ensureDemoUsers();
    if (!silent) {
      console.log('🔐 Migración de autenticación e historial completada.');
      console.log(`   Usuarios demo actualizados. Contraseña temporal: ${DEMO_PASSWORD}`);
    }
    return true;
  } catch (err) {
    console.error('⚠️  No se pudo ejecutar la migración de autenticación:', err.message);
    if (!silent) throw err;
    return false;
  }
}

if (require.main === module) {
  (async () => {
    const connected = await db.testConnection();
    if (!connected) {
      console.error('❌ No se pudo conectar a la base de datos.');
      process.exit(1);
    }
    const ok = await runMigration();
    process.exit(ok ? 0 : 1);
  })();
}

module.exports = { runMigration, DEMO_PASSWORD };
