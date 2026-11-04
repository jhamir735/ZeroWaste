-- ==============================================================
-- ZeroWaste - Base de Datos PostgreSQL
-- Archivo: backend/database.sql
-- Compatible con Neon PostgreSQL (Cloud) y PostgreSQL Local
-- ==============================================================

-- 1. Eliminar tablas previas si existen
DROP TABLE IF EXISTS recetas_cocinadas CASCADE;
DROP TABLE IF EXISTS favoritos CASCADE;
DROP TABLE IF EXISTS alimentos_consumidos CASCADE;
DROP TABLE IF EXISTS alimentos CASCADE;
DROP TABLE IF EXISTS recetas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- 2. Tabla: usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    username VARCHAR(50) UNIQUE,
    password_hash TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla: alimentos
CREATE TABLE alimentos (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    categoria VARCHAR(50) NOT NULL, -- frutas, lacteos, carnes, cereales, bebidas, otros
    cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad >= 1),
    ubicacion VARCHAR(50) NOT NULL DEFAULT 'refrigeradora', -- refrigeradora, congelador, despensa
    fecha_vencimiento DATE NOT NULL,
    notas TEXT,
    imagen TEXT, -- Base64 o URL
    color VARCHAR(20) DEFAULT '#1E7A46',
    inicial VARCHAR(5) DEFAULT 'A',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alimentos_usuario ON alimentos(usuario_id);
CREATE INDEX idx_alimentos_vencimiento ON alimentos(fecha_vencimiento);

-- 4. Tabla: historial de alimentos consumidos / eliminados
CREATE TABLE alimentos_consumidos (
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
    motivo VARCHAR(20) NOT NULL DEFAULT 'consumido', -- consumido, eliminado, cocinado
    fecha_consumo TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consumidos_usuario ON alimentos_consumidos(usuario_id);
CREATE INDEX idx_consumidos_fecha ON alimentos_consumidos(fecha_consumo DESC);

-- 5. Tabla: recetas
CREATE TABLE recetas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    tiempo VARCHAR(50) NOT NULL,
    porciones VARCHAR(50) NOT NULL,
    dificultad VARCHAR(50) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    color VARCHAR(20) DEFAULT '#1E7A46',
    inicial VARCHAR(5) DEFAULT 'R',
    texto_ahorro TEXT,
    ingredientes_salvados TEXT[] DEFAULT '{}',
    ingredientes JSONB NOT NULL DEFAULT '[]',
    pasos JSONB NOT NULL DEFAULT '[]',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla: favoritos
CREATE TABLE favoritos (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    receta_id INT REFERENCES recetas(id) ON DELETE CASCADE,
    fecha_guardado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_receta_fav UNIQUE(usuario_id, receta_id)
);

CREATE INDEX idx_favoritos_usuario ON favoritos(usuario_id);

-- 7. Tabla: recetas_cocinadas
CREATE TABLE recetas_cocinadas (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    receta_id INT REFERENCES recetas(id) ON DELETE CASCADE,
    receta_nombre VARCHAR(200),
    receta_id_externo VARCHAR(100),
    fecha_cocinado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cocinadas_usuario ON recetas_cocinadas(usuario_id);

-- 8. Tabla: recetas_cache (Caché temporal de 24h para APIs externas e IA)
CREATE TABLE IF NOT EXISTS recetas_cache (
    id SERIAL PRIMARY KEY,
    receta_id_externo VARCHAR(100) NOT NULL,
    origen VARCHAR(50) NOT NULL, -- 'themealdb', 'spoonacular', 'peruana', 'ia'
    hash_busqueda VARCHAR(64),
    nombre VARCHAR(200) NOT NULL,
    imagen TEXT,
    tiempo VARCHAR(50) DEFAULT '25 min',
    porciones VARCHAR(50) DEFAULT '2-3 porciones',
    dificultad VARCHAR(50) DEFAULT 'Media',
    categoria VARCHAR(100) DEFAULT 'General',
    area VARCHAR(100) DEFAULT 'Internacional',
    texto_ahorro TEXT,
    ingredientes JSONB NOT NULL DEFAULT '[]'::jsonb,
    pasos JSONB NOT NULL DEFAULT '[]'::jsonb,
    es_ia BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expira_en TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    CONSTRAINT uq_receta_cache UNIQUE(origen, receta_id_externo)
);

CREATE INDEX IF NOT EXISTS idx_recetas_cache_expira ON recetas_cache(expira_en);
CREATE INDEX IF NOT EXISTS idx_recetas_cache_hash ON recetas_cache(hash_busqueda);

-- ==============================================================
-- DATOS INICIALES (POBLADO COMPLETO)
-- ==============================================================

-- Usuarios
-- La contraseña se asigna al ejecutar `node migrate_auth.js`:
--   maria / carlos / ana  →  zerowaste123
INSERT INTO usuarios (nombre, email, username) VALUES
('María Pérez', 'maria@correo.com', 'maria'),
('Carlos Mendoza', 'carlos.m@correo.com', 'carlos'),
('Ana Lucía Torres', 'ana.torres@correo.com', 'ana');

-- Alimentos para María (usuario_id = 1)
INSERT INTO alimentos (usuario_id, nombre, categoria, cantidad, ubicacion, fecha_vencimiento, notas, color, inicial) VALUES
-- Vencen hoy
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

-- Recetas completas
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

SELECT setval('recetas_id_seq', (SELECT MAX(id) FROM recetas));

-- Historial de alimentos consumidos (datos demo para gráficos e historial)
INSERT INTO alimentos_consumidos
(usuario_id, alimento_id, nombre, categoria, cantidad, ubicacion, fecha_vencimiento, notas, color, inicial, motivo, fecha_consumo) VALUES
(1, NULL, 'Palta Hass',       'frutas',   2, 'refrigeradora', CURRENT_DATE - INTERVAL '2 day', 'Preparada en ensalada',        '#A71619', 'P', 'consumido', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(1, NULL, 'Tomate Italiano',  'frutas',   3, 'refrigeradora', CURRENT_DATE - INTERVAL '1 day', 'Usado en salsa casera',        '#F5A524', 'T', 'consumido', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(1, NULL, 'Yogur natural',    'lacteos',  1, 'refrigeradora', CURRENT_DATE + INTERVAL '1 day', 'Desayuno con fruta',           '#6B48A3', 'Y', 'consumido', CURRENT_TIMESTAMP - INTERVAL '2 day'),
(1, NULL, 'Plátano de seda',  'frutas',   2, 'despensa',      CURRENT_DATE,                   'Panqueques de avena',          '#D3B38D', 'P', 'cocinado',  CURRENT_TIMESTAMP - INTERVAL '3 day'),
(1, NULL, 'Manzana Royal Gala','frutas',  2, 'despensa',      CURRENT_DATE + INTERVAL '3 day', 'Snack de la tarde',            '#A71619', 'M', 'consumido', CURRENT_TIMESTAMP - INTERVAL '4 day'),
(1, NULL, 'Queso fresco',     'lacteos',  1, 'refrigeradora', CURRENT_DATE + INTERVAL '1 day', 'Tortilla de verduras',         '#55665B', 'Q', 'cocinado',  CURRENT_TIMESTAMP - INTERVAL '5 day'),
(1, NULL, 'Lechuga Americana','frutas',   1, 'refrigeradora', CURRENT_DATE,                   'Ensalada del almuerzo',        '#2F9E5B', 'L', 'consumido', CURRENT_TIMESTAMP - INTERVAL '6 day'),
(1, NULL, 'Avena en hojuelas','cereales', 1, 'despensa',      CURRENT_DATE + INTERVAL '60 day','Panqueques y batidos',          '#55665B', 'A', 'cocinado',  CURRENT_TIMESTAMP - INTERVAL '8 day'),
(1, NULL, 'Jugo de naranja',  'bebidas',  1, 'refrigeradora', CURRENT_DATE + INTERVAL '2 day', 'Bebida del desayuno',          '#F5A524', 'J', 'consumido', CURRENT_TIMESTAMP - INTERVAL '9 day'),
(1, NULL, 'Espinaca fresca',  'frutas',   1, 'refrigeradora', CURRENT_DATE,                   'Se marchitó antes de usarla',  '#1E7A46', 'E', 'eliminado', CURRENT_TIMESTAMP - INTERVAL '10 day');

-- Favoritos
INSERT INTO favoritos (usuario_id, receta_id) VALUES
(1, 1),
(1, 4),
(1, 7);

-- Historial de cocinados
INSERT INTO recetas_cocinadas (usuario_id, receta_id, receta_nombre, fecha_cocinado) VALUES
(1, 1, 'Ensalada de palta y tomate', CURRENT_TIMESTAMP - INTERVAL '5 day'),
(1, 2, 'Tortilla de verduras con queso', CURRENT_TIMESTAMP - INTERVAL '3 day'),
(1, 6, 'Arroz salteado con verduras', CURRENT_TIMESTAMP - INTERVAL '1 day');
