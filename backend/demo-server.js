/* =============================================
   ZeroWaste – Backend de Demostración sin PostgreSQL
   Archivo: backend/demo-server.js

   Sirve el frontend y una API compatible con la app,
   guardando los datos en backend/demo-data.json.

   Uso:
     npm run demo
     npm run demo:reset   (borra y vuelve a crear los datos demo)
   ============================================= */
'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const AuthService = require('./services/auth.service');
const { requireAuth } = require('./middleware/auth.middleware');
const RecommendationEngine = require('./services/recommendation.engine');
const PERUVIAN_RECIPES = require('./services/peruvianRecipes.data');
const { buildPdf } = require('./services/pdf.service');
const { buildExcel } = require('./services/report.service');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(__dirname, 'demo-data.json');
const DEMO_PASSWORD = 'zerowaste123';
const RESET = process.argv.includes('--reset');

const AVATAR_COLORS = [
  '#A71619', '#1E7A46', '#F5A524', '#2F9E5B',
  '#55665B', '#6B48A3', '#D3B38D', '#0B6E4F', '#C0392B'
];

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MOTIVO_LABEL = { consumido: 'Consumido', eliminado: 'Eliminado', cocinado: 'Usado en receta' };
const CATEGORIA_LABEL = {
  frutas: 'Frutas y verduras',
  lacteos: 'Lácteos',
  cereales: 'Cereales',
  carnes: 'Carnes',
  bebidas: 'Bebidas',
  otros: 'Otros'
};

/* =============================================
   Utilidades de fecha y formato
   ============================================= */
function pad (n) { return String(n).padStart(2, '0'); }

function toDateOnly (value) {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLocalISO (value) {
  const d = value instanceof Date ? value : new Date(value);
  return `${toDateOnly(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseDateOnly (value) {
  if (!value) return null;
  const parts = String(value).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function addDays (base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo (days, hours) {
  const d = new Date();
  d.setDate(d.getDate() - (days || 0));
  d.setHours(d.getHours() - (hours || 0));
  return d;
}

function daysUntil (dateStr) {
  const exp = parseDateOnly(dateStr);
  if (!exp) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((exp - today) / 86400000);
}

function formatShortDate (value) {
  const d = parseDateOnly(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : String(value || '');
}

function formatDateTime (value) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value).replace('T', ' ');
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDateOnly (value) {
  if (!value) return '-';
  const d = parseDateOnly(value);
  if (!d) return String(value);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function startOfWeek (date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth (date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey (value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return toDateOnly(d);
}

function badgeInfo (days) {
  if (days <= 0) return { text: 'Vence hoy', cls: 'badge-urgent' };
  if (days === 1) return { text: 'Vence mañana', cls: 'badge-warning' };
  if (days <= 3) return { text: 'En ' + days + ' días', cls: 'badge-ok' };
  return { text: 'En ' + days + ' días', cls: 'badge-safe' };
}

function avatarColor (name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function money (value) { return 'S/ ' + Number(value || 0).toFixed(2); }

function nextId (collection) {
  return collection.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

/* =============================================
   Datos demo
   ============================================= */
function createDemoData () {
  const now = new Date();

  const usuarios = [
    {
      id: 1, nombre: 'María Pérez', email: 'maria@correo.com', username: 'maria',
      password_hash: AuthService.hashPassword(DEMO_PASSWORD), fecha_registro: toLocalISO(now)
    },
    {
      id: 2, nombre: 'Carlos Mendoza', email: 'carlos.m@correo.com', username: 'carlos',
      password_hash: AuthService.hashPassword(DEMO_PASSWORD), fecha_registro: toLocalISO(now)
    },
    {
      id: 3, nombre: 'Ana Lucía Torres', email: 'ana.torres@correo.com', username: 'ana',
      password_hash: AuthService.hashPassword(DEMO_PASSWORD), fecha_registro: toLocalISO(now)
    }
  ];

  const seedFoods = [
    ['Palta Hass', 'frutas', 2, 'refrigeradora', 0, 'Madura, ideal para consumir hoy', '#A71619', 'P'],
    ['Espinaca fresca', 'frutas', 1, 'refrigeradora', 0, 'Usar para ensalada o salteado', '#1E7A46', 'E'],
    ['Tomate Italiano', 'frutas', 6, 'refrigeradora', 1, 'Muy rojos, perfectos para salsa', '#F5A524', 'T'],
    ['Plátano de seda', 'frutas', 4, 'despensa', 1, 'Con manchas, ideal para panqueques', '#D3B38D', 'P'],
    ['Carne molida', 'carnes', 1, 'refrigeradora', 1, 'Cocinar mañana para el almuerzo', '#C0392B', 'C'],
    ['Lechuga Americana', 'frutas', 1, 'refrigeradora', 2, 'Envolver en papel absorbente', '#2F9E5B', 'L'],
    ['Queso fresco', 'lacteos', 1, 'refrigeradora', 2, 'Guardar en táper hermético', '#55665B', 'Q'],
    ['Yogur natural', 'lacteos', 2, 'refrigeradora', 3, 'Consumir en el desayuno', '#6B48A3', 'Y'],
    ['Jugo de naranja', 'bebidas', 1, 'refrigeradora', 3, 'Botella de 500 ml', '#F5A524', 'J'],
    ['Zanahoria fresca', 'frutas', 4, 'refrigeradora', 4, 'Crujiente y limpia', '#F5A524', 'Z'],
    ['Manzana Royal Gala', 'frutas', 5, 'despensa', 5, 'Compradas en el mercado', '#A71619', 'M'],
    ['Leche entera', 'lacteos', 1, 'refrigeradora', 6, 'Caja tetra pak cerrada', '#0B6E4F', 'L'],
    ['Limón Tahití', 'frutas', 4, 'despensa', 8, 'Para aliños y jugos', '#2F9E5B', 'L'],
    ['Huevos de corral', 'otros', 12, 'despensa', 15, 'Bandeja fresca', '#D3B38D', 'H'],
    ['Cebolla roja', 'frutas', 3, 'despensa', 20, 'Lugar fresco y ventilado', '#6B48A3', 'C'],
    ['Papa amarilla', 'frutas', 6, 'despensa', 14, 'Mantener en la oscuridad', '#D3B38D', 'P'],
    ['Pechuga de pollo', 'carnes', 2, 'congelador', 60, 'Congeladas en porciones', '#C0392B', 'P'],
    ['Filete de pescado', 'carnes', 2, 'congelador', 45, 'Pescado blanco congelado', '#0B6E4F', 'F'],
    ['Arroz superior', 'cereales', 1, 'despensa', 90, 'Bolsa de 1 kg sellada', '#D3B38D', 'A'],
    ['Fideos espagueti', 'cereales', 2, 'despensa', 120, 'Paquetes de 500 g', '#F5A524', 'F'],
    ['Avena en hojuelas', 'cereales', 1, 'despensa', 75, 'Tarro hermético', '#55665B', 'A'],
    ['Aceite de oliva', 'otros', 1, 'despensa', 180, 'Botella de vidrio oscuro', '#1E7A46', 'A']
  ];

  const alimentos = seedFoods.map((item, index) => ({
    id: index + 1,
    usuario_id: 1,
    nombre: item[0],
    categoria: item[1],
    cantidad: item[2],
    ubicacion: item[3],
    fecha_vencimiento: toDateOnly(addDays(now, item[4])),
    notas: item[5],
    imagen: null,
    color: item[6],
    inicial: item[7],
    fecha_creacion: toLocalISO(addDays(now, -20 + index))
  }));

  const byName = {};
  alimentos.forEach((food) => { byName[food.nombre] = food; });

  function snapshot (name, cantidad, motivo, days, hours, notas) {
    const food = byName[name] || {};
    return {
      id: 0,
      usuario_id: 1,
      alimento_id: food.id || null,
      nombre: name,
      categoria: food.categoria || 'otros',
      cantidad: cantidad,
      ubicacion: food.ubicacion || 'despensa',
      fecha_vencimiento: food.fecha_vencimiento || null,
      notas: notas || '',
      imagen: null,
      color: food.color || avatarColor(name),
      inicial: food.inicial || name.charAt(0).toUpperCase(),
      motivo: motivo,
      fecha_consumo: toLocalISO(daysAgo(days, hours || 0))
    };
  }

  const consumidos = [
    snapshot('Palta Hass', 2, 'consumido', 0, 2, 'Preparada en ensalada'),
    snapshot('Tomate Italiano', 3, 'consumido', 1, 0, 'Usado en salsa casera'),
    snapshot('Yogur natural', 1, 'consumido', 2, 0, 'Desayuno con fruta'),
    snapshot('Plátano de seda', 2, 'cocinado', 3, 0, 'Panqueques de avena'),
    snapshot('Manzana Royal Gala', 2, 'consumido', 4, 0, 'Snack de la tarde'),
    snapshot('Queso fresco', 1, 'cocinado', 5, 0, 'Tortilla de verduras'),
    snapshot('Lechuga Americana', 1, 'consumido', 6, 0, 'Ensalada del almuerzo'),
    snapshot('Avena en hojuelas', 1, 'cocinado', 8, 0, 'Panqueques y batidos'),
    snapshot('Jugo de naranja', 1, 'consumido', 9, 0, 'Bebida del desayuno'),
    snapshot('Espinaca fresca', 1, 'eliminado', 10, 0, 'Se marchitó antes de usarla')
  ].map((item, index) => Object.assign({}, item, { id: index + 1 }));

  const cocinados = [
    { usuario_id: 1, receta_id: 1, receta_nombre: PERUVIAN_RECIPES[0].nombre, receta_id_externo: PERUVIAN_RECIPES[0].receta_id_externo, fecha_cocinado: toLocalISO(daysAgo(5)) },
    { usuario_id: 1, receta_id: 1, receta_nombre: PERUVIAN_RECIPES[1].nombre, receta_id_externo: PERUVIAN_RECIPES[1].receta_id_externo, fecha_cocinado: toLocalISO(daysAgo(3)) },
    { usuario_id: 1, receta_id: 1, receta_nombre: PERUVIAN_RECIPES[2].nombre, receta_id_externo: PERUVIAN_RECIPES[2].receta_id_externo, fecha_cocinado: toLocalISO(daysAgo(1)) }
  ].map((item, index) => Object.assign({}, item, { id: index + 1 }));

  return {
    version: 1,
    usuarios,
    alimentos,
    consumidos,
    cocinados,
    favoritos: [
      { usuario_id: 1, receta_id: PERUVIAN_RECIPES[0].receta_id_externo },
      { usuario_id: 1, receta_id: PERUVIAN_RECIPES[1].receta_id_externo }
    ],
    recetas_ia: [],
    seq: {
      usuarios: usuarios.length + 1,
      alimentos: alimentos.length + 1,
      consumidos: consumidos.length + 1,
      cocinados: cocinados.length + 1
    }
  };
}

function normalizeData (data) {
  const base = createDemoData();
  return {
    version: 1,
    usuarios: Array.isArray(data.usuarios) ? data.usuarios : base.usuarios,
    alimentos: Array.isArray(data.alimentos) ? data.alimentos : [],
    consumidos: Array.isArray(data.consumidos) ? data.consumidos : [],
    cocinados: Array.isArray(data.cocinados) ? data.cocinados : [],
    favoritos: Array.isArray(data.favoritos) ? data.favoritos : [],
    recetas_ia: Array.isArray(data.recetas_ia) ? data.recetas_ia : [],
    seq: Object.assign({}, base.seq, data.seq || {})
  };
}

function loadData () {
  if (RESET && fs.existsSync(DATA_FILE)) {
    fs.unlinkSync(DATA_FILE);
  }
  if (fs.existsSync(DATA_FILE)) {
    try {
      return normalizeData(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    } catch (err) {
      console.warn('⚠️  No se pudo leer demo-data.json, se recreará:', err.message);
    }
  }
  const data = createDemoData();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

const data = loadData();

function persist () {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️  No se pudo guardar demo-data.json:', err.message);
  }
}

/* =============================================
   Ayudantes de usuarios y alimentos
   ============================================= */
function safeUser (user) {
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    username: user.username,
    fecha_registro: user.fecha_registro
  };
}

function findUserById (id) {
  return data.usuarios.find((u) => Number(u.id) === Number(id));
}

function findUserByIdentifier (identifier) {
  const value = String(identifier || '').toLowerCase();
  return data.usuarios.find((u) =>
    String(u.email || '').toLowerCase() === value ||
    String(u.username || '').toLowerCase() === value
  );
}

function getUserFoods (userId) {
  return data.alimentos
    .filter((f) => Number(f.usuario_id) === Number(userId))
    .slice()
    .sort((a, b) => daysUntil(a.fecha_vencimiento) - daysUntil(b.fecha_vencimiento));
}

function foodForApi (food) {
  const dias = daysUntil(food.fecha_vencimiento);
  return Object.assign({}, food, {
    fecha_vencimiento: food.fecha_vencimiento,
    dias_restantes: dias,
    dias: dias,
    badge: badgeInfo(dias)
  });
}

function recordConsumption (userId, food, cantidad, motivo, notas) {
  const record = {
    id: data.seq.consumidos++,
    usuario_id: Number(userId),
    alimento_id: food.id || null,
    nombre: food.nombre,
    categoria: food.categoria || 'otros',
    cantidad: Math.max(1, Number(cantidad) || 1),
    ubicacion: food.ubicacion || 'despensa',
    fecha_vencimiento: food.fecha_vencimiento || null,
    notas: notas || food.notas || '',
    imagen: food.imagen || null,
    color: food.color || avatarColor(food.nombre),
    inicial: food.inicial || String(food.nombre || 'A').charAt(0).toUpperCase(),
    motivo: motivo || 'consumido',
    fecha_consumo: toLocalISO(new Date())
  };
  data.consumidos.push(record);
  return record;
}

function getUserByReq (req) {
  return findUserById(req.usuario.id);
}

/* =============================================
   Estadísticas
   ============================================= */
function sumQuantity (records) {
  return records.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
}

function buildStats (userId) {
  const foods = getUserFoods(userId);
  const consumidos = data.consumidos.filter((c) => Number(c.usuario_id) === Number(userId));
  const cocinados = data.cocinados.filter((c) => Number(c.usuario_id) === Number(userId));

  const urgentes = foods.filter((f) => daysUntil(f.fecha_vencimiento) <= 0).length;
  const proximos = foods.filter((f) => {
    const d = daysUntil(f.fecha_vencimiento);
    return d > 0 && d <= 3;
  }).length;

  const totalConsumidosMotivo = sumQuantity(consumidos.filter((c) => c.motivo === 'consumido'));
  const totalUsadosReceta = sumQuantity(consumidos.filter((c) => c.motivo === 'cocinado'));
  const totalEliminados = sumQuantity(consumidos.filter((c) => c.motivo === 'eliminado'));
  const totalConsumidos = totalConsumidosMotivo + totalUsadosReceta;

  const totalAlimentos = foods.length;
  const unidades = foods.reduce((sum, f) => sum + (Number(f.cantidad) || 0), 0);
  const totalCocinadas = cocinados.length;

  const ahorroSoles = 48 + (totalCocinadas * 8.25) + (totalAlimentos * 1.5) + (totalConsumidos * 1.25);
  const kgDesperdicio = 2.6 + (totalCocinadas * 0.4) + (totalAlimentos * 0.15) + (totalConsumidos * 0.2);
  const alimentosSalvados = 6 + (totalCocinadas * 2) + totalConsumidos + Math.max(0, totalAlimentos - urgentes);

  const hoy = new Date();

  const consumoDiario = [];
  const recetasDiario = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(hoy, -i);
    const key = toDateOnly(d);
    consumoDiario.push({
      fecha: key,
      label: DIAS_CORTOS[d.getDay()],
      cantidad: sumQuantity(consumidos.filter((c) => c.motivo !== 'eliminado' && dateKey(c.fecha_consumo) === key))
    });
    recetasDiario.push({
      fecha: key,
      label: DIAS_CORTOS[d.getDay()],
      cantidad: cocinados.filter((c) => dateKey(c.fecha_cocinado) === key).length
    });
  }

  const currentWeek = startOfWeek(hoy);
  const consumoSemanal = [];
  const recetasSemanal = [];
  for (let i = 5; i >= 0; i--) {
    const start = addDays(currentWeek, -i * 7);
    const end = addDays(start, 7);
    consumoSemanal.push({
      inicio: toDateOnly(start),
      label: formatShortDate(toDateOnly(start)),
      semana: 6 - i,
      cantidad: sumQuantity(consumidos.filter((c) => {
        const d = new Date(c.fecha_consumo);
        return c.motivo !== 'eliminado' && d >= start && d < end;
      }))
    });
    recetasSemanal.push({
      inicio: toDateOnly(start),
      label: formatShortDate(toDateOnly(start)),
      semana: 6 - i,
      cantidad: cocinados.filter((c) => {
        const d = new Date(c.fecha_cocinado);
        return d >= start && d < end;
      }).length
    });
  }

  const currentMonth = startOfMonth(hoy);
  const consumoMensual = [];
  const recetasMensual = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    consumoMensual.push({
      periodo: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
      label: MESES_CORTOS[start.getMonth()],
      cantidad: sumQuantity(consumidos.filter((c) => {
        const d = new Date(c.fecha_consumo);
        return c.motivo !== 'eliminado' && d >= start && d < end;
      }))
    });
    recetasMensual.push({
      periodo: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
      label: MESES_CORTOS[start.getMonth()],
      cantidad: cocinados.filter((c) => {
        const d = new Date(c.fecha_cocinado);
        return d >= start && d < end;
      }).length
    });
  }

  const categoryMap = {};
  foods.forEach((f) => {
    categoryMap[f.categoria] = (categoryMap[f.categoria] || 0) + (Number(f.cantidad) || 0);
  });

  const topMap = {};
  consumidos.filter((c) => c.motivo !== 'eliminado').forEach((c) => {
    topMap[c.nombre] = (topMap[c.nombre] || 0) + (Number(c.cantidad) || 0);
  });

  return {
    total_en_inventario: totalAlimentos,
    unidades_en_inventario: unidades,
    alertas_activas: urgentes + proximos,
    alimentos_urgentes_hoy: urgentes,
    proximos_a_vencer: proximos,
    recetas_cocinadas: totalCocinadas,
    dinero_ahorrado_pen: Number(ahorroSoles.toFixed(2)),
    kg_desperdicio_evitado: Number(kgDesperdicio.toFixed(1)),
    alimentos_salvados_total: alimentosSalvados,
    total_consumidos: totalConsumidos,
    total_eliminados: totalEliminados,
    registros_historial: consumidos.length,
    ultimo_consumo: consumidos.length
      ? consumidos.slice().sort((a, b) => new Date(b.fecha_consumo) - new Date(a.fecha_consumo))[0].fecha_consumo
      : null,
    historico_semanal: recetasSemanal.map((r) => ({ semana: r.inicio, cantidad: r.cantidad, label: r.label })),
    historico_mensual: recetasMensual.map((r) => ({ mes: r.periodo, cantidad: r.cantidad, label: r.label })),
    consumo_diario: consumoDiario,
    recetas_diario: recetasDiario,
    consumo_semanal: consumoSemanal,
    consumo_mensual: consumoMensual,
    recetas_semanal: recetasSemanal,
    recetas_mensual: recetasMensual,
    categorias_inventario: Object.keys(categoryMap).map((categoria) => ({
      categoria, cantidad: categoryMap[categoria]
    })).sort((a, b) => b.cantidad - a.cantidad),
    top_consumidos: Object.keys(topMap).map((nombre) => ({ nombre, cantidad: topMap[nombre] }))
      .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre))
      .slice(0, 5),
    historial_reciente: consumidos.slice().sort((a, b) => new Date(b.fecha_consumo) - new Date(a.fecha_consumo)).slice(0, 6),
    logros: {
      principiante: alimentosSalvados >= 1,
      chef_creativo: totalCocinadas >= 1,
      heroe_verde: ahorroSoles >= 50,
      despensa_activa: totalAlimentos >= 10
    }
  };
}

/* =============================================
   Recetas
   ============================================= */
function getCatalog () {
  return PERUVIAN_RECIPES.concat(data.recetas_ia || []);
}

function findRecipe (id) {
  const str = String(id);
  return getCatalog().find((r) =>
    String(r.id) === str ||
    String(r.receta_id_externo) === str
  );
}

function favoriteIdsFor (userId) {
  return new Set(
    data.favoritos
      .filter((f) => Number(f.usuario_id) === Number(userId))
      .map((f) => String(f.receta_id))
  );
}

function evaluateCatalogForUser (userId) {
  const foods = getUserFoods(userId).map((f) => Object.assign({}, f, {
    dias_restantes: daysUntil(f.fecha_vencimiento)
  }));
  const favs = favoriteIdsFor(userId);
  const evaluated = RecommendationEngine.evaluateRecipes(getCatalog(), foods);

  return evaluated.map((r) => Object.assign({}, r, {
    es_favorita: favs.has(String(r.id)) || favs.has(String(r.receta_id_externo))
  }));
}

function evaluateOneForUser (recipe, userId) {
  const foods = getUserFoods(userId).map((f) => Object.assign({}, f, {
    dias_restantes: daysUntil(f.fecha_vencimiento)
  }));
  const favs = favoriteIdsFor(userId);

  const evaluated = RecommendationEngine.evaluateRecipes([recipe], foods)[0];
  const base = evaluated || Object.assign({}, recipe, {
    id: recipe.id || recipe.receta_id_externo,
    receta_id_externo: recipe.receta_id_externo || String(recipe.id),
    score: 0,
    ingredientes_disponibles: [],
    ingredientes_faltantes: (recipe.ingredientes || []).map((ing) => ({
      nombre: typeof ing === 'string' ? ing : (ing.nombre || ing.name || ''),
      cantidad: typeof ing === 'object' ? (ing.cantidad || '') : '',
      es_basico: false
    })),
    faltantes_no_basicos_count: (recipe.ingredientes || []).length,
    porcentaje_disponible: 0,
    puede_cocinar_ya: false,
    aprovecha_urgentes: false,
    salva_urgentes_count: 0,
    vencen_hoy_count: 0,
    resumen_ahorro: recipe.texto_ahorro || 'Aprovecha los alimentos de tu despensa.'
  });

  return Object.assign({}, base, {
    es_favorita: favs.has(String(base.id)) || favs.has(String(base.receta_id_externo))
  });
}

/* =============================================
   Reportes
   ============================================= */
function buildReport (userId, tipo) {
  const user = findUserById(userId) || { nombre: 'Usuario', email: '' };
  const stats = buildStats(userId);
  const foods = getUserFoods(userId);
  const consumidos = data.consumidos
    .filter((c) => Number(c.usuario_id) === Number(userId))
    .slice()
    .sort((a, b) => new Date(b.fecha_consumo) - new Date(a.fecha_consumo));
  const cocinados = data.cocinados
    .filter((c) => Number(c.usuario_id) === Number(userId))
    .slice()
    .sort((a, b) => new Date(b.fecha_cocinado) - new Date(a.fecha_cocinado));

  const summary = [
    { label: 'Usuario', value: user.nombre || 'Usuario' },
    { label: 'Correo', value: user.email || '-' },
    { label: 'Ahorro estimado', value: money(stats.dinero_ahorrado_pen) },
    { label: 'Desperdicio evitado', value: Number(stats.kg_desperdicio_evitado).toFixed(1) + ' kg' },
    { label: 'Alimentos salvados', value: String(stats.alimentos_salvados_total) },
    { label: 'Alimentos consumidos', value: String(stats.total_consumidos) },
    { label: 'Recetas cocinadas', value: String(stats.recetas_cocinadas) },
    { label: 'En inventario', value: String(stats.total_en_inventario) }
  ];

  const inventoryRows = foods.map((item) => [
    item.nombre,
    CATEGORIA_LABEL[item.categoria] || item.categoria || 'Otros',
    item.cantidad,
    item.ubicacion || '-',
    formatDateOnly(item.fecha_vencimiento),
    daysUntil(item.fecha_vencimiento) <= 0 ? 'Vence hoy' : daysUntil(item.fecha_vencimiento) + ' días'
  ]);

  const consumedRows = consumidos.map((item) => [
    formatDateTime(item.fecha_consumo),
    item.nombre,
    item.cantidad,
    MOTIVO_LABEL[item.motivo] || item.motivo || '-',
    CATEGORIA_LABEL[item.categoria] || item.categoria || 'Otros'
  ]);

  const cookedRows = cocinados.map((item) => [
    formatDateTime(item.fecha_cocinado),
    item.receta_nombre || ('Receta #' + item.receta_id)
  ]);

  const trendRows = (stats.consumo_diario || []).map((item, index) => {
    const receta = (stats.recetas_diario || [])[index];
    return [
      item.label + ' (' + formatDateOnly(item.fecha) + ')',
      item.cantidad,
      receta ? receta.cantidad : 0
    ];
  });

  const base = {
    usuario: [user.nombre, user.email].filter(Boolean).join(' · '),
    summary
  };

  if (tipo === 'inventario') {
    return Object.assign({}, base, {
      title: 'Reporte de inventario ZeroWaste',
      subtitle: 'Alimentos disponibles, ubicación y fechas de vencimiento',
      sections: [{
        heading: 'Inventario actual (' + foods.length + ' alimentos)',
        columns: [
          { label: 'Alimento', width: 1.7 },
          { label: 'Categoría', width: 1.25 },
          { label: 'Cant.', width: 0.6, align: 'center' },
          { label: 'Ubicación', width: 1.1 },
          { label: 'Vence', width: 0.95 },
          { label: 'Días', width: 0.8, align: 'center' }
        ],
        rows: inventoryRows
      }]
    });
  }

  if (tipo === 'historial') {
    return Object.assign({}, base, {
      title: 'Historial de consumo ZeroWaste',
      subtitle: 'Alimentos consumidos, eliminados y recetas preparadas',
      sections: [
        {
          heading: 'Alimentos consumidos o eliminados',
          columns: [
            { label: 'Fecha', width: 1.5 },
            { label: 'Alimento', width: 1.8 },
            { label: 'Cant.', width: 0.55, align: 'center' },
            { label: 'Motivo', width: 1.15 },
            { label: 'Categoría', width: 1.3 }
          ],
          rows: consumedRows
        },
        {
          heading: 'Recetas cocinadas',
          columns: [{ label: 'Fecha', width: 1.4 }, { label: 'Receta', width: 4.5 }],
          rows: cookedRows
        }
      ]
    });
  }

  return Object.assign({}, base, {
    title: 'Reporte de estadísticas e impacto',
    subtitle: 'Resumen de ahorro, consumo y actividad en ZeroWaste',
    sections: [
      {
        heading: 'Tendencia de consumo (últimos 7 días)',
        columns: [
          { label: 'Día', width: 2.2 },
          { label: 'Alimentos consumidos', width: 1.5, align: 'center' },
          { label: 'Recetas cocinadas', width: 1.5, align: 'center' }
        ],
        rows: trendRows
      },
      {
        heading: 'Historial de alimentos consumidos',
        columns: [
          { label: 'Fecha', width: 1.5 },
          { label: 'Alimento', width: 1.8 },
          { label: 'Cant.', width: 0.55, align: 'center' },
          { label: 'Motivo', width: 1.15 },
          { label: 'Categoría', width: 1.3 }
        ],
        rows: consumedRows
      },
      {
        heading: 'Recetas cocinadas',
        columns: [{ label: 'Fecha', width: 1.4 }, { label: 'Receta', width: 4.5 }],
        rows: cookedRows
      },
      {
        heading: 'Inventario actual',
        columns: [
          { label: 'Alimento', width: 1.7 },
          { label: 'Categoría', width: 1.25 },
          { label: 'Cant.', width: 0.6, align: 'center' },
          { label: 'Ubicación', width: 1.1 },
          { label: 'Vence', width: 0.95 },
          { label: 'Días', width: 0.8, align: 'center' }
        ],
        rows: inventoryRows
      }
    ]
  });
}

/* =============================================
   Middlewares
   ============================================= */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use((req, res, next) => {
  const hora = new Date().toLocaleTimeString();
  console.log(`[${hora}] ${req.method} ${req.url}`);
  next();
});

/* =============================================
   Salud del servidor demo
   ============================================= */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ZeroWaste Demo API',
    database: 'JSON local (sin PostgreSQL)',
    timestamp: new Date().toISOString()
  });
});

/* =============================================
   Autenticación
   ============================================= */
app.post('/api/auth/registro', (req, res) => {
  try {
    const { nombre, email, username, usuario, password, confirmar_password } = req.body || {};
    const nombreLimpio = String(nombre || '').trim();
    const emailLimpio = String(email || '').trim().toLowerCase();
    let usernameLimpio = AuthService.sanitizeUsername(username || usuario);

    if (nombreLimpio.length < 2) {
      return res.status(400).json({ success: false, message: 'Ingresa tu nombre (mínimo 2 caracteres).' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
      return res.status(400).json({ success: false, message: 'Ingresa un correo electrónico válido.' });
    }
    if (!usernameLimpio) usernameLimpio = AuthService.usernameFromEmail(emailLimpio);
    if (usernameLimpio.length < 3) {
      return res.status(400).json({ success: false, message: 'El usuario debe tener al menos 3 caracteres.' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    if (confirmar_password !== undefined && String(confirmar_password) !== String(password)) {
      return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden.' });
    }

    const existe = data.usuarios.find((u) =>
      String(u.email || '').toLowerCase() === emailLimpio ||
      String(u.username || '').toLowerCase() === usernameLimpio
    );
    if (existe) {
      return res.status(409).json({
        success: false,
        message: String(existe.email || '').toLowerCase() === emailLimpio
          ? 'Ya existe una cuenta con ese correo electrónico.'
          : 'Ese nombre de usuario ya está en uso.'
      });
    }

    const user = {
      id: data.seq.usuarios++,
      nombre: nombreLimpio,
      email: emailLimpio,
      username: usernameLimpio,
      password_hash: AuthService.hashPassword(password),
      fecha_registro: toLocalISO(new Date())
    };
    data.usuarios.push(user);
    persist();

    res.status(201).json({
      success: true,
      message: '¡Cuenta creada con éxito!',
      token: AuthService.signToken(user),
      data: safeUser(user)
    });
  } catch (err) {
    console.error('Error en registro demo:', err);
    res.status(500).json({ success: false, message: 'No se pudo crear la cuenta demo.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, usuario, email, password } = req.body || {};
    const identificador = String(identifier || usuario || email || '').trim();
    if (!identificador || !password) {
      return res.status(400).json({ success: false, message: 'Ingresa tu usuario o correo y tu contraseña.' });
    }

    const user = findUserByIdentifier(identificador);
    if (!user || !AuthService.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }

    res.json({
      success: true,
      message: 'Bienvenido de nuevo',
      token: AuthService.signToken(user),
      data: safeUser(user)
    });
  } catch (err) {
    console.error('Error en login demo:', err);
    res.status(500).json({ success: false, message: 'No se pudo iniciar sesión en el modo demo.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = getUserByReq(req);
  if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  res.json({ success: true, data: safeUser(user) });
});

app.put('/api/auth/password', requireAuth, (req, res) => {
  const user = getUserByReq(req);
  const { password_actual, password_nuevo } = req.body || {};
  if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  if (!AuthService.verifyPassword(password_actual, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'La contraseña actual no es correcta.' });
  }
  if (!password_nuevo || String(password_nuevo).length < 6) {
    return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }
  user.password_hash = AuthService.hashPassword(password_nuevo);
  persist();
  res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
});

/* =============================================
   Usuario
   ============================================= */
app.get('/api/usuario', requireAuth, (req, res) => {
  const user = getUserByReq(req);
  if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  res.json({ success: true, data: safeUser(user) });
});

app.put('/api/usuario', requireAuth, (req, res) => {
  const user = getUserByReq(req);
  if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

  const { nombre, email } = req.body || {};
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ success: false, message: 'El nombre es requerido' });
  }

  const emailLimpio = email ? String(email).trim().toLowerCase() : user.email;
  const repetido = data.usuarios.find((u) =>
    u.id !== user.id && String(u.email || '').toLowerCase() === emailLimpio
  );
  if (repetido) {
    return res.status(409).json({ success: false, message: 'Ese correo electrónico ya está registrado.' });
  }

  user.nombre = String(nombre).trim();
  user.email = emailLimpio;
  persist();
  res.json({ success: true, message: 'Perfil actualizado', data: safeUser(user) });
});

/* =============================================
   Alimentos
   ============================================= */
app.get('/api/alimentos', requireAuth, (req, res) => {
  let foods = getUserFoods(req.usuario.id);
  const categoria = req.query.categoria;
  const busqueda = req.query.q;

  if (categoria && categoria !== 'todos') {
    foods = foods.filter((f) => f.categoria === categoria);
  }
  if (busqueda && String(busqueda).trim()) {
    const q = String(busqueda).toLowerCase();
    foods = foods.filter((f) =>
      f.nombre.toLowerCase().includes(q) ||
      String(f.ubicacion || '').toLowerCase().includes(q)
    );
  }

  res.json({ success: true, count: foods.length, data: foods.map(foodForApi) });
});

app.get('/api/alimentos/alertas', requireAuth, (req, res) => {
  const alertas = getUserFoods(req.usuario.id).filter((f) => daysUntil(f.fecha_vencimiento) <= 3);
  res.json({ success: true, count: alertas.length, data: alertas.map(foodForApi) });
});

app.get('/api/alimentos/:id', requireAuth, (req, res) => {
  const food = data.alimentos.find((f) =>
    Number(f.id) === Number(req.params.id) &&
    Number(f.usuario_id) === Number(req.usuario.id)
  );
  if (!food) return res.status(404).json({ success: false, message: 'Alimento no encontrado' });
  res.json({ success: true, data: foodForApi(food) });
});

app.post('/api/alimentos', requireAuth, (req, res) => {
  const { nombre, categoria, cantidad, ubicacion, fecha_vencimiento, notas, imagen } = req.body || {};
  if (!nombre || !categoria || !fecha_vencimiento) {
    return res.status(400).json({
      success: false,
      message: 'Los campos nombre, categoria y fecha_vencimiento son obligatorios.'
    });
  }

  const food = {
    id: data.seq.alimentos++,
    usuario_id: Number(req.usuario.id),
    nombre: String(nombre).trim(),
    categoria: String(categoria).trim().toLowerCase(),
    cantidad: Math.max(1, parseInt(cantidad, 10) || 1),
    ubicacion: String(ubicacion || 'refrigeradora').trim().toLowerCase(),
    fecha_vencimiento: String(fecha_vencimiento).slice(0, 10),
    notas: notas ? String(notas).trim() : '',
    imagen: imagen || null,
    color: avatarColor(String(nombre).trim()),
    inicial: String(nombre).trim().charAt(0).toUpperCase(),
    fecha_creacion: toLocalISO(new Date())
  };

  data.alimentos.push(food);
  persist();
  res.status(201).json({ success: true, message: 'Alimento registrado exitosamente', data: foodForApi(food) });
});

app.put('/api/alimentos/:id', requireAuth, (req, res) => {
  const food = data.alimentos.find((f) =>
    Number(f.id) === Number(req.params.id) &&
    Number(f.usuario_id) === Number(req.usuario.id)
  );
  if (!food) return res.status(404).json({ success: false, message: 'Alimento no encontrado para actualizar' });

  const { nombre, categoria, cantidad, ubicacion, fecha_vencimiento, notas, imagen, motivo } = req.body || {};
  const nuevaCantidad = cantidad !== undefined ? parseInt(cantidad, 10) : null;

  if (nuevaCantidad !== null && (isNaN(nuevaCantidad) || nuevaCantidad <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'La cantidad debe ser mayor a cero. Usa el historial para registrar el consumo.'
    });
  }

  let cantidadConsumida = 0;
  if (nuevaCantidad !== null && nuevaCantidad < food.cantidad) {
    cantidadConsumida = food.cantidad - nuevaCantidad;
    recordConsumption(
      req.usuario.id,
      food,
      cantidadConsumida,
      motivo || 'consumido',
      'Consumo parcial desde el inventario'
    );
  }

  if (nombre) {
    food.nombre = String(nombre).trim();
    food.color = avatarColor(food.nombre);
    food.inicial = food.nombre.charAt(0).toUpperCase();
  }
  if (categoria) food.categoria = String(categoria).toLowerCase();
  if (nuevaCantidad !== null) food.cantidad = nuevaCantidad;
  if (ubicacion) food.ubicacion = String(ubicacion).toLowerCase();
  if (fecha_vencimiento) food.fecha_vencimiento = String(fecha_vencimiento).slice(0, 10);
  if (notas !== undefined) food.notas = notas;
  if (imagen !== undefined) food.imagen = imagen;

  persist();
  res.json({
    success: true,
    message: 'Alimento actualizado',
    data: foodForApi(food),
    cantidad_consumida: cantidadConsumida
  });
});

app.delete('/api/alimentos/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const nombre = req.query.nombre || (req.body && req.body.nombre);
  const motivo = String(req.query.motivo || (req.body && req.body.motivo) || 'consumido').toLowerCase();

  let index = data.alimentos.findIndex((f) =>
    Number(f.id) === id && Number(f.usuario_id) === Number(req.usuario.id)
  );

  if (index < 0 && nombre) {
    index = data.alimentos.findIndex((f) =>
      Number(f.usuario_id) === Number(req.usuario.id) &&
      f.nombre.toLowerCase() === String(nombre).trim().toLowerCase()
    );
  }

  if (index < 0) {
    return res.status(404).json({ success: false, message: 'Alimento no encontrado para eliminar en el modo demo' });
  }

  const food = data.alimentos[index];
  recordConsumption(
    req.usuario.id,
    food,
    food.cantidad,
    ['consumido', 'eliminado', 'cocinado'].includes(motivo) ? motivo : 'consumido'
  );
  data.alimentos.splice(index, 1);
  persist();

  res.json({
    success: true,
    message: 'Alimento "' + food.nombre + '" ' + (motivo === 'eliminado' ? 'eliminado' : 'consumido') + ' correctamente',
    data: { id: food.id, nombre: food.nombre, motivo }
  });
});

/* =============================================
   Estadísticas e historial
   ============================================= */
app.get('/api/estadisticas', requireAuth, (req, res) => {
  res.json({ success: true, data: buildStats(req.usuario.id) });
});

app.get('/api/historial', requireAuth, (req, res) => {
  const userId = Number(req.usuario.id);
  const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 20, 1), 100);
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const offsetConsumos = Math.max(0, parseInt(req.query.offset_consumos, 10) || offset);
  const offsetCocinados = Math.max(0, parseInt(req.query.offset_cocinados, 10) || offset);
  const motivo = String(req.query.motivo || 'todos').toLowerCase();

  let consumos = data.consumidos
    .filter((c) => Number(c.usuario_id) === userId)
    .slice()
    .sort((a, b) => new Date(b.fecha_consumo) - new Date(a.fecha_consumo));

  if (['consumido', 'eliminado', 'cocinado'].includes(motivo)) {
    consumos = consumos.filter((c) => c.motivo === motivo);
  }

  const cocinados = data.cocinados
    .filter((c) => Number(c.usuario_id) === userId)
    .slice()
    .sort((a, b) => new Date(b.fecha_cocinado) - new Date(a.fecha_cocinado));

  const totalConsumos = consumos.length;
  const totalCocinados = cocinados.length;
  const allConsumos = data.consumidos.filter((c) => Number(c.usuario_id) === userId);

  res.json({
    success: true,
    data: {
      consumos: consumos.slice(offsetConsumos, offsetConsumos + limite),
      cocinados: cocinados.slice(offsetCocinados, offsetCocinados + limite),
      total_consumos: totalConsumos,
      total_cocinados: totalCocinados,
      resumen: {
        consumidos: sumQuantity(allConsumos.filter((c) => c.motivo === 'consumido')),
        eliminados: sumQuantity(allConsumos.filter((c) => c.motivo === 'eliminado')),
        usados_receta: sumQuantity(allConsumos.filter((c) => c.motivo === 'cocinado')),
        registros: allConsumos.length
      },
      paginacion: {
        limite,
        offset_consumos: offsetConsumos,
        offset_cocinados: offsetCocinados,
        hay_mas_consumos: offsetConsumos + limite < totalConsumos,
        hay_mas_cocinados: offsetCocinados + limite < totalCocinados
      }
    }
  });
});

/* =============================================
   Reportes
   ============================================= */
app.get('/api/reportes/:tipo', requireAuth, (req, res) => {
  try {
    const tipo = ['estadisticas', 'inventario', 'historial'].includes(req.params.tipo)
      ? req.params.tipo
      : 'estadisticas';
    const formato = String(req.query.formato || 'pdf').toLowerCase() === 'excel' ? 'excel' : 'pdf';
    const report = buildReport(req.usuario.id, tipo);
    const buffer = formato === 'excel'
      ? Buffer.from(buildExcel(report), 'utf8')
      : buildPdf(report);

    const extension = formato === 'excel' ? 'xls' : 'pdf';
    const mime = formato === 'excel'
      ? 'application/vnd.ms-excel; charset=utf-8'
      : 'application/pdf';
    const filename = 'ZeroWaste_' + tipo + '_' + toDateOnly(new Date()) + '.' + extension;

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Error al generar reporte demo:', err);
    res.status(500).json({ success: false, message: 'No se pudo generar el reporte demo.' });
  }
});

/* =============================================
   Recetas
   ============================================= */
app.get('/api/recetas/recomendaciones', requireAuth, (req, res) => {
  const filtro = req.query.filtro || 'todas';
  const busqueda = String(req.query.q || '').toLowerCase().trim();
  let recipes = evaluateCatalogForUser(req.usuario.id);

  if (filtro === 'listas') {
    recipes = recipes.filter((r) => r.puede_cocinar_ya);
  } else if (filtro === 'urgentes') {
    recipes = recipes.filter((r) => r.aprovecha_urgentes);
  } else if (filtro === 'ia') {
    recipes = recipes.filter((r) => r.es_ia);
  } else if (filtro === 'comprar') {
    recipes = recipes.filter((r) => !r.puede_cocinar_ya);
  } else if (filtro === 'favoritas') {
    recipes = recipes.filter((r) => r.es_favorita);
  }

  if (busqueda) {
    recipes = recipes.filter((r) =>
      String(r.nombre || '').toLowerCase().includes(busqueda) ||
      String(r.area || '').toLowerCase().includes(busqueda) ||
      (r.ingredientes_disponibles || []).some((i) => String(i.nombre || '').toLowerCase().includes(busqueda)) ||
      (r.ingredientes_faltantes || []).some((i) => String(i.nombre || '').toLowerCase().includes(busqueda))
    );
  }

  const foods = getUserFoods(req.usuario.id);
  res.json({
    success: true,
    count: recipes.length,
    data: recipes,
    resumen_despensa: {
      total_alimentos: foods.length,
      vencen_hoy: foods.filter((f) => daysUntil(f.fecha_vencimiento) <= 0).length,
      proximos_vencer: foods.filter((f) => {
        const d = daysUntil(f.fecha_vencimiento);
        return d > 0 && d <= 3;
      }).length
    }
  });
});

app.post('/api/recetas/generar-ia', requireAuth, (req, res) => {
  const foods = getUserFoods(req.usuario.id).filter((f) => daysUntil(f.fecha_vencimiento) >= 0);
  if (foods.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No tienes alimentos vigentes en tu despensa para generar una receta.'
    });
  }

  const selected = foods.slice(0, 4);
  const id = 'ia_demo_' + Date.now();
  const nombres = selected.map((f) => f.nombre);
  const receta = {
    id: id,
    receta_id_externo: id,
    origen: 'ia',
    es_ia: true,
    nombre: 'Salteado ZeroWaste de ' + nombres.slice(0, 2).join(' y '),
    imagen: null,
    tiempo: '20 min',
    porciones: '2 porciones',
    dificultad: 'Fácil',
    categoria: 'Creativa',
    area: 'ZeroWaste',
    color: '#1E7A46',
    inicial: 'Z',
    texto_ahorro: 'Receta demo generada con los alimentos que tienes en tu despensa.',
    ingredientes_salvados: nombres,
    ingredientes: selected.map((f) => ({
      nombre: f.nombre,
      cantidad: '1 porción de ' + f.nombre
    })),
    pasos: [
      'Lava y corta todos los ingredientes en trozos parejos.',
      'Calienta una sartén con un poco de aceite a fuego medio.',
      'Saltea primero los alimentos de cocción más lenta y luego los más delicados.',
      'Sazona al gusto y cocina hasta que todo esté tierno. Sirve caliente.'
    ]
  };

  data.recetas_ia.push(receta);
  persist();

  const evaluada = evaluateOneForUser(receta, req.usuario.id);
  res.status(201).json({
    success: true,
    message: '¡Receta demo generada con éxito!',
    data: evaluada
  });
});

app.get('/api/recetas', requireAuth, (req, res) => {
  return res.redirect(307, '/api/recetas/recomendaciones?' + new URLSearchParams(req.query).toString());
});

app.get('/api/recetas/:id', requireAuth, (req, res) => {
  const recipe = findRecipe(req.params.id);
  if (!recipe) return res.status(404).json({ success: false, message: 'Receta no encontrada' });
  res.json({ success: true, data: evaluateOneForUser(recipe, req.usuario.id) });
});

app.post('/api/recetas/:id/favorito', requireAuth, (req, res) => {
  const id = String(req.params.id);
  const userId = Number(req.usuario.id);
  const index = data.favoritos.findIndex((f) =>
    Number(f.usuario_id) === userId && String(f.receta_id) === id
  );

  if (index >= 0) {
    data.favoritos.splice(index, 1);
    persist();
    return res.json({ success: true, message: 'Receta quitada de favoritos', es_favorita: false });
  }

  data.favoritos.push({ usuario_id: userId, receta_id: id });
  persist();
  res.json({ success: true, message: 'Receta guardada en favoritos', es_favorita: true });
});

app.post('/api/recetas/:id/cocinar', requireAuth, (req, res) => {
  const id = String(req.params.id);
  const recipe = findRecipe(id);
  if (!recipe) return res.status(404).json({ success: false, message: 'Receta no encontrada' });

  const userId = Number(req.usuario.id);
  const nombreReceta = recipe.nombre || ('Receta #' + id);
  const descontar = req.body.descontar_alimentos !== false;
  const foods = getUserFoods(userId);
  const descontados = [];

  if (descontar && Array.isArray(recipe.ingredientes)) {
    for (const ing of recipe.ingredientes) {
      const ingName = typeof ing === 'string' ? ing : (ing.nombre || ing.name || '');
      const food = foods.find((f) =>
        Number(f.cantidad) > 0 && RecommendationEngine.matchesIngredient(ingName, f.nombre)
      );
      if (!food) continue;

      recordConsumption(userId, food, 1, 'cocinado', 'Usado en receta: ' + nombreReceta);

      if (Number(food.cantidad) > 1) {
        food.cantidad = Number(food.cantidad) - 1;
        descontados.push(food.nombre + ' (-1 unidad)');
      } else {
        food.cantidad = 0;
        const index = data.alimentos.indexOf(food);
        if (index >= 0) data.alimentos.splice(index, 1);
        descontados.push(food.nombre + ' (agotado)');
      }
    }
  }

  data.cocinados.push({
    id: data.seq.cocinados++,
    usuario_id: userId,
    receta_id: 1,
    receta_nombre: nombreReceta,
    receta_id_externo: id,
    fecha_cocinado: toLocalISO(new Date())
  });

  persist();
  res.json({
    success: true,
    message: '¡Receta "' + nombreReceta + '" cocinada con éxito!',
    alimentos_descontados: descontados
  });
});

/* =============================================
   Frontend estático
   ============================================= */
app.use(express.static(ROOT, {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }
}));

app.get('/', (req, res) => {
  res.redirect('/01-bienvenida/index.html');
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Ruta API no encontrada: ' + req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error('💥 Error en servidor demo:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor demo' });
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log('🧪 ZeroWaste – MODO DEMO (sin PostgreSQL)');
  console.log(`🚀 Servidor escuchando en: http://localhost:${PORT}`);
  console.log(`🌐 Aplicación:              http://localhost:${PORT}/01-bienvenida/index.html`);
  console.log(`💾 Datos guardados en:      ${DATA_FILE}`);
  console.log('====================================================');
  console.log('👤 Acceso demo: maria@correo.com  /  ' + DEMO_PASSWORD);
  console.log('   También puedes usar el usuario: maria');
  console.log('   Crea cuentas nuevas o usa carlos / ana con la misma contraseña.');
  console.log('====================================================');
});
