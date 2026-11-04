/* =============================================
   ZeroWaste – Script de Poblado Completo de Datos en Neon
   Archivo: backend/seed_neon.js
   ============================================= */
'use strict';

const db = require('./config/db');

async function seed () {
  console.log('🔄 Conectando a Neon para poblar datos completos...');
  const connected = await db.testConnection();
  if (!connected) {
    console.error('❌ No se pudo conectar a Neon.');
    process.exit(1);
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🧹 Limpiando tablas previas...');
    await client.query('TRUNCATE TABLE recetas_cocinadas, favoritos, alimentos, recetas, usuarios RESTART IDENTITY CASCADE;');

    // 1. Insertar Usuarios
    console.log('👤 Insertando usuarios...');
    const userQuery = `
      INSERT INTO usuarios (nombre, email) VALUES
      ('María Pérez', 'maria@correo.com'),
      ('Carlos Mendoza', 'carlos.m@correo.com'),
      ('Ana Lucía Torres', 'ana.torres@correo.com')
      RETURNING id, nombre;
    `;
    const userRes = await client.query(userQuery);
    console.log(`   ${userRes.rows.length} usuarios creados.`);

    // 2. Insertar Alimentos variados para María (usuario_id = 1)
    console.log('🥑 Insertando despensa completa de alimentos...');
    const foodQuery = `
      INSERT INTO alimentos (usuario_id, nombre, categoria, cantidad, ubicacion, fecha_vencimiento, notas, color, inicial) VALUES
      -- Vencen hoy (urgentes)
      (1, 'Palta Hass',          'frutas',   2, 'refrigeradora', CURRENT_DATE,                   'Madura, ideal para consumir hoy',                 '#A71619', 'P'),
      (1, 'Espinaca fresca',     'frutas',   1, 'refrigeradora', CURRENT_DATE,                   'Usar para ensalada o salteado',                   '#1E7A46', 'E'),
      -- Vencen mañana / 1 día
      (1, 'Tomate Italiano',     'frutas',   6, 'refrigeradora', CURRENT_DATE + INTERVAL '1 day', 'Muy rojos, perfectos para salsa o ensalada',      '#F5A524', 'T'),
      (1, 'Plátano de seda',     'frutas',   4, 'despensa',      CURRENT_DATE + INTERVAL '1 day', 'Con manchas, perfecto para panqueques o batido', '#D3B38D', 'P'),
      (1, 'Carne molida',        'carnes',   1, 'refrigeradora', CURRENT_DATE + INTERVAL '1 day', 'Cocinar bien mañana para el almuerzo',           '#C0392B', 'C'),
      -- Próximos a vencer (2 a 3 días)
      (1, 'Lechuga Americana',   'frutas',   1, 'refrigeradora', CURRENT_DATE + INTERVAL '2 day', 'Envolver en papel absorbente para conservar',    '#2F9E5B', 'L'),
      (1, 'Queso fresco',        'lacteos',  1, 'refrigeradora', CURRENT_DATE + INTERVAL '2 day', 'Guardar en táper hermético',                    '#55665B', 'Q'),
      (1, 'Yogur natural',       'lacteos',  2, 'refrigeradora', CURRENT_DATE + INTERVAL '3 day', 'Consumir en el desayuno con fruta',              '#6B48A3', 'Y'),
      (1, 'Jugo de naranja',     'bebidas',  1, 'refrigeradora', CURRENT_DATE + INTERVAL '3 day', 'Botella de 500ml recién exprimido',              '#F5A524', 'J'),
      -- Tiempo seguro (4 a 10 días)
      (1, 'Zanahoria fresca',    'frutas',   4, 'refrigeradora', CURRENT_DATE + INTERVAL '4 day', 'Crujiente y limpia',                             '#F5A524', 'Z'),
      (1, 'Manzana Royal Gala',  'frutas',   5, 'despensa',      CURRENT_DATE + INTERVAL '5 day', 'Compradas en el mercado',                        '#A71619', 'M'),
      (1, 'Leche entera',        'lacteos',  1, 'refrigeradora', CURRENT_DATE + INTERVAL '6 day', 'Caja tetra pak cerrada',                         '#0B6E4F', 'L'),
      (1, 'Limón Tahití',        'frutas',   4, 'despensa',      CURRENT_DATE + INTERVAL '8 day', 'Para aliños y jugos',                            '#2F9E5B', 'L'),
      (1, 'Huevos de corral',    'otros',   12, 'despensa',      CURRENT_DATE + INTERVAL '15 day', 'Bandeja fresca',                                '#D3B38D', 'H'),
      (1, 'Cebolla roja',        'frutas',   3, 'despensa',      CURRENT_DATE + INTERVAL '20 day', 'Lugar fresco y ventilado',                      '#6B48A3', 'C'),
      (1, 'Papa amarilla',       'frutas',   6, 'despensa',      CURRENT_DATE + INTERVAL '14 day', 'Mantener en la oscuridad',                      '#D3B38D', 'P'),
      -- Larga duración / Congelador y despensa
      (1, 'Pechuga de pollo',    'carnes',   2, 'congelador',    CURRENT_DATE + INTERVAL '60 day', 'Congeladas en porciones individuales',          '#C0392B', 'P'),
      (1, 'Filete de pescado',   'carnes',   2, 'congelador',    CURRENT_DATE + INTERVAL '45 day', 'Pescado blanco congelado',                     '#0B6E4F', 'F'),
      (1, 'Arroz superior',      'cereales', 1, 'despensa',      CURRENT_DATE + INTERVAL '90 day', 'Bolsa de 1 kg sellada',                         '#D3B38D', 'A'),
      (1, 'Fideos espagueti',    'cereales', 2, 'despensa',      CURRENT_DATE + INTERVAL '120 day', 'Paquetes de 500g',                             '#F5A524', 'F'),
      (1, 'Avena en hojuelas',   'cereales', 1, 'despensa',      CURRENT_DATE + INTERVAL '75 day', 'Tarro hermético',                              '#55665B', 'A'),
      (1, 'Aceite de oliva',     'otros',    1, 'despensa',      CURRENT_DATE + INTERVAL '180 day', 'Botella de vidrio oscuro',                    '#1E7A46', 'A');
    `;
    await client.query(foodQuery);
    console.log('   22 alimentos de muestra insertados.');

    // 3. Insertar Recetas completas
    console.log('📖 Insertando recetario completo con ingredientes y pasos...');
    const recipeQuery = `
      INSERT INTO recetas (id, nombre, tiempo, porciones, dificultad, tags, color, inicial, texto_ahorro, ingredientes_salvados, ingredientes, pasos) VALUES
      (
        1,
        'Ensalada de palta y tomate',
        '20 min',
        '2 porciones',
        'Baja dif.',
        ARRAY['sugeridas', 'rapidas'],
        '#A71619',
        'P',
        'Esta receta salva 2 ingredientes que vencen pronto: Palta y Tomate.',
        ARRAY['Palta', 'Tomate'],
        '[
          {"name": "1 Palta madura", "urgent": true},
          {"name": "2 Tomates medianos", "urgent": true},
          {"name": "1/2 Cebolla roja en juliana", "urgent": false},
          {"name": "Jugo de 1 limón fresco", "urgent": false},
          {"name": "Sal y aceite de oliva al gusto", "urgent": false}
        ]'::jsonb,
        '[
          "Corta la palta por la mitad, retira la pepa y corta la pulpa en cubos parejos.",
          "Lava y corta los tomates en cuadrados del mismo tamaño.",
          "Corta la cebolla roja en juliana fina y lávala con agua fría y sal para quitar el amargor.",
          "Mezcla todo con cuidado en un bol, añade jugo de limón, sal y un buen chorro de aceite de oliva."
        ]'::jsonb
      ),
      (
        2,
        'Tortilla de verduras con queso',
        '15 min',
        '2 porciones',
        'Baja dif.',
        ARRAY['sugeridas', 'rapidas'],
        '#1E7A46',
        'T',
        'Aprovecha tus tomates, espinacas y queso fresco antes de que pierdan frescura.',
        ARRAY['Tomate', 'Espinaca', 'Queso'],
        '[
          {"name": "1 Tomate picado en cubos", "urgent": true},
          {"name": "1 taza de Espinaca picada fina", "urgent": true},
          {"name": "50g de Queso fresco desmenuzado", "urgent": true},
          {"name": "2 Huevos frescos", "urgent": false},
          {"name": "1 pizca de sal, pimienta y orégano", "urgent": false},
          {"name": "1 cucharadita de aceite", "urgent": false}
        ]'::jsonb,
        '[
          "Pica el tomate en cuadraditos y corta la espinaca lavada en tiras delgadas.",
          "Bate los 2 huevos en un plato hondo con sal, pimienta y orégano al gusto.",
          "Añade las verduras y el queso fresco al huevo batido e integra suavemente.",
          "Calienta una sartén con aceite a fuego medio, vierte la mezcla y cocina 3 minutos por lado hasta dorar."
        ]'::jsonb
      ),
      (
        3,
        'Sopa de verduras reconfortante',
        '35 min',
        '4 porciones',
        'Media dif.',
        ARRAY['sugeridas'],
        '#F5A524',
        'S',
        'Aprovecha verduras maduras y dale un toque cítrico con limón fresco.',
        ARRAY['Tomate', 'Zanahoria', 'Limón'],
        '[
          {"name": "2 Tomates picados", "urgent": true},
          {"name": "1 Zanahoria pelada y en rodajas", "urgent": false},
          {"name": "1 Limón (para el toque final)", "urgent": false},
          {"name": "1 litro de agua o caldo vegetal", "urgent": false},
          {"name": "1 diente de ajo y pizca de sal", "urgent": false}
        ]'::jsonb,
        '[
          "En una olla con una cucharadita de aceite dora el ajo picado.",
          "Añade los tomates y las zanahorias picadas, sofriendo a fuego medio por 4 minutos.",
          "Vierte el caldo o agua, sazona con sal y hierve tapado a fuego suave por 25 minutos.",
          "Sirve bien caliente con unas gotas de jugo de limón para realzar el sabor."
        ]'::jsonb
      ),
      (
        4,
        'Guacamole casero',
        '10 min',
        '3 porciones',
        'Muy fácil',
        ARRAY['rapidas'],
        '#2F9E5B',
        'G',
        'Usa la palta madura al instante junto con limón fresco.',
        ARRAY['Palta', 'Limón'],
        '[
          {"name": "2 Paltas maduras", "urgent": true},
          {"name": "Jugo de 1 limón", "urgent": false},
          {"name": "1 Tomate picado sin semillas", "urgent": false},
          {"name": "1 cucharada de cilantro picado", "urgent": false},
          {"name": "Sal al gusto", "urgent": false}
        ]'::jsonb,
        '[
          "Corta las paltas por la mitad, desecha la pepa y tritura la pulpa con un tenedor.",
          "Vierte inmediatamente el jugo de limón para evitar que se oscurezca.",
          "Incorpora el tomate en cubitos y el cilantro.",
          "Ajusta con sal al gusto y sirve con tostadas o galletas integrales."
        ]'::jsonb
      ),
      (
        5,
        'Batido saludable de manzana y yogur',
        '5 min',
        '2 porciones',
        'Muy fácil',
        ARRAY['rapidas'],
        '#6B48A3',
        'B',
        'Usa las manzanas y yogur de tu despensa para un snack refrescante.',
        ARRAY['Manzana', 'Yogur'],
        '[
          {"name": "2 Manzanas cortadas en dados", "urgent": true},
          {"name": "1 taza de Yogur natural", "urgent": true},
          {"name": "1 cucharadita de miel o canela", "urgent": false},
          {"name": "Cubos de hielo al gusto", "urgent": false}
        ]'::jsonb,
        '[
          "Lava las manzanas, retira el centro y córtalas con cáscara para aprovechar la fibra.",
          "Coloca las manzanas y el yogur en la licuadora.",
          "Agrega la miel o canela y un par de cubos de hielo.",
          "Licúa a potencia alta durante 1 minuto hasta obtener una mezcla cremosa y homogénea."
        ]'::jsonb
      ),
      (
        6,
        'Arroz salteado con verduras',
        '15 min',
        '2 porciones',
        'Fácil',
        ARRAY['rapidas'],
        '#D3B38D',
        'A',
        'Rescata el arroz y vegetales de tu alacena en un delicioso salteado.',
        ARRAY['Arroz', 'Tomate'],
        '[
          {"name": "1 taza de Arroz cocido", "urgent": false},
          {"name": "1 Tomate en juliana", "urgent": true},
          {"name": "1 Huevo batido", "urgent": false},
          {"name": "1 cucharada de sillao o salsa de soya", "urgent": false},
          {"name": "Cebolla o verduras al gusto", "urgent": false}
        ]'::jsonb,
        '[
          "En una sartén caliente con poco aceite, vierte el huevo batido y revuelve rápidamente.",
          "Agrega el arroz cocido y remueve a fuego alto para que tome temperatura.",
          "Añade el tomate y un chorrito de sillao, salteando durante 2 minutos.",
          "Retira del fuego y sirve de inmediato mientras esté crujiente."
        ]'::jsonb
      ),
      (
        7,
        'Panqueques de avena y plátano maduro',
        '12 min',
        '2 porciones',
        'Muy fácil',
        ARRAY['sugeridas', 'rapidas'],
        '#F5A524',
        'P',
        'Salva los plátanos muy maduros preparando unos panqueques nutritivos sin azúcar añadida.',
        ARRAY['Plátano', 'Avena', 'Huevo'],
        '[
          {"name": "2 Plátanos muy maduros", "urgent": true},
          {"name": "1 taza de Avena en hojuelas", "urgent": false},
          {"name": "2 Huevos", "urgent": false},
          {"name": "1 cucharadita de canela en polvo", "urgent": false}
        ]'::jsonb,
        '[
          "Tritura los plátanos con un tenedor hasta formar un puré suave.",
          "Agrega los 2 huevos y mezcla vigorosamente.",
          "Incorpora la avena en hojuelas y la canela, dejando reposar la masa por 3 minutos.",
          "Cocina cucharadas de la mezcla en una sartén antiadherente a fuego bajo por 2 minutos por lado."
        ]'::jsonb
      ),
      (
        8,
        'Salteado criollo de carne con tomate y cebolla',
        '18 min',
        '2 porciones',
        'Media dif.',
        ARRAY['sugeridas'],
        '#C0392B',
        'S',
        'Aprovecha la carne molida o en tiras junto a los tomates y cebolla de tu despensa.',
        ARRAY['Carne', 'Tomate', 'Cebolla'],
        '[
          {"name": "250g de Carne en tiras o molida", "urgent": true},
          {"name": "2 Tomates en gajos gruesos", "urgent": true},
          {"name": "1 Cebolla roja en pluma gruesa", "urgent": false},
          {"name": "1 cucharada de sillao y vinagre tinto", "urgent": false},
          {"name": "Sal, pimienta y comino al gusto", "urgent": false}
        ]'::jsonb,
        '[
          "Calienta una sartén o wok a fuego muy alto con una cucharada de aceite.",
          "Saltea la carne sazonada con sal y pimienta durante 3 minutos hasta dorar.",
          "Añade la cebolla y el tomate a fuego vivo para que queden crocantes.",
          "Vierte el sillao y el vinagre, salteando por 1 minuto más. Sirve con arroz caliente."
        ]'::jsonb
      );
    `;
    await client.query(recipeQuery);
    await client.query("SELECT setval('recetas_id_seq', (SELECT MAX(id) FROM recetas));");
    console.log('   8 recetas de muestra insertadas.');

    // 4. Insertar Favoritos iniciales
    console.log('❤️  Insertando recetas favoritas iniciales...');
    await client.query(`
      INSERT INTO favoritos (usuario_id, receta_id) VALUES
      (1, 1), -- Ensalada de palta
      (1, 4), -- Guacamole
      (1, 7); -- Panqueques de plátano
    `);
    console.log('   3 recetas marcadas como favoritas para María.');

    // 5. Insertar Historial de Recetas Cocinadas (para dar vida a las estadísticas)
    console.log('🍳 Insertando historial de recetas cocinadas...');
    await client.query(`
      INSERT INTO recetas_cocinadas (usuario_id, receta_id, fecha_cocinado) VALUES
      (1, 1, CURRENT_TIMESTAMP - INTERVAL '5 day'),
      (1, 2, CURRENT_TIMESTAMP - INTERVAL '3 day'),
      (1, 6, CURRENT_TIMESTAMP - INTERVAL '1 day');
    `);
    console.log('   3 recetas registradas en el historial de cocinados.');

    await client.query('COMMIT');

    console.log('========================================================');
    console.log('🎉 ¡Base de datos Neon en la nube poblada exitosamente!');
    console.log('========================================================');

    // Comprobación final
    const usersCount = (await client.query('SELECT COUNT(*) FROM usuarios')).rows[0].count;
    const foodsCount = (await client.query('SELECT COUNT(*) FROM alimentos')).rows[0].count;
    const recipesCount = (await client.query('SELECT COUNT(*) FROM recetas')).rows[0].count;
    const favsCount = (await client.query('SELECT COUNT(*) FROM favoritos')).rows[0].count;
    const cookedCount = (await client.query('SELECT COUNT(*) FROM recetas_cocinadas')).rows[0].count;

    console.log(`📊 Resumen de datos en Neon:`);
    console.log(`   - Usuarios:           ${usersCount}`);
    console.log(`   - Alimentos:          ${foodsCount}`);
    console.log(`   - Recetas:            ${recipesCount}`);
    console.log(`   - Favoritos:          ${favsCount}`);
    console.log(`   - Recetas cocinadas:  ${cookedCount}`);

    process.exit(0);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error al poblar Neon:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();

