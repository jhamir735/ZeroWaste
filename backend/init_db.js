/* =============================================
   ZeroWaste – Script para Inicializar Base de Datos en Neon
   Archivo: backend/init_db.js
   ============================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function init () {
  console.log('🔄 Conectando a Neon PostgreSQL...');
  const connected = await db.testConnection();
  if (!connected) {
    console.error('❌ Abortando inicialización.');
    process.exit(1);
  }

  try {
    const sqlPath = path.join(__dirname, 'database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Ejecutando script SQL en Neon (creando tablas e insertando datos)...');
    await db.query(sql);

    console.log('🎉 ¡Base de datos en Neon inicializada con éxito!');
    console.log('   Tablas creadas: usuarios, alimentos, recetas, favoritos, recetas_cocinadas.');

    // Verificar conteos
    const u = await db.query('SELECT COUNT(*) FROM usuarios');
    const a = await db.query('SELECT COUNT(*) FROM alimentos');
    const r = await db.query('SELECT COUNT(*) FROM recetas');
    console.log(`   - Usuarios registrados: ${u.rows[0].count}`);
    console.log(`   - Alimentos de muestra: ${a.rows[0].count}`);
    console.log(`   - Recetas cargadas:    ${r.rows[0].count}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error al inicializar tablas en Neon:', err);
    process.exit(1);
  }
}

init();

