/* =============================================
   ZeroWaste – Shared Data Store (Connected to Backend API + Local Cache)
   Ruta: shared/store.js
   Conecta con Node.js / Express y PostgreSQL (Neon)
   ============================================= */

'use strict';

const ZWStore = (function () {

  const API_BASE = (typeof window !== 'undefined' && window.location.origin.includes(':3000'))
    ? '/api'
    : 'http://localhost:3000/api';

  const FALLBACK_DISH_SVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 320" width="100%" height="100%">' +
      '<defs>' +
        '<linearGradient id="zwBg" x1="0%" y1="0%" x2="100%" y2="100%">' +
          '<stop offset="0%" stop-color="#1B5E34" />' +
          '<stop offset="50%" stop-color="#24874B" />' +
          '<stop offset="100%" stop-color="#144626" />' +
        '</linearGradient>' +
        '<radialGradient id="zwPlate" cx="50%" cy="50%" r="50%">' +
          '<stop offset="0%" stop-color="#FFFFFF" />' +
          '<stop offset="85%" stop-color="#F4F7F4" />' +
          '<stop offset="100%" stop-color="#DCE4DF" />' +
        '</radialGradient>' +
      '</defs>' +
      '<rect width="100%" height="100%" fill="url(#zwBg)" />' +
      '<circle cx="250" cy="140" r="90" fill="url(#zwPlate)" style="filter:drop-shadow(0 10px 18px rgba(0,0,0,0.28))" />' +
      '<circle cx="250" cy="140" r="74" fill="none" stroke="#D3B38D" stroke-width="2.5" stroke-dasharray="5 3" />' +
      '<g transform="translate(205, 95) scale(1.8)" fill="none" stroke="#1E7A46" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M6 18h36M12 18a12 12 0 0 1 24 0M24 6v6M22 6h4" />' +
        '<path d="M16 11c1-2 4-3 8-3" stroke="#2F9E5B" stroke-width="1.5" />' +
      '</g>' +
      '<text x="250" y="258" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="16" font-weight="700" fill="#FFFFFF" letter-spacing="0.5">Receta ZeroWaste</text>' +
      '<text x="250" y="280" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="12" fill="rgba(255,255,255,0.85)">Cocina Inteligente Anti-Desperdicio</text>' +
    '</svg>'
  );

  const KEYS = {
    FOODS:       'zw_foods',
    FAVORITES:   'zw_favorites',
    USER:        'zw_user',
    COOKED:      'zw_cooked',
    RECIPES:     'zw_recipes',
    STATS:       'zw_stats',
    TOKEN:       'zw_auth_token',
  };

  const AUTH_PAGE = /\/01-bienvenida\//.test(window.location.pathname);

  function loginUrl () {
    return new URL('../01-bienvenida/index.html', window.location.href).href;
  }

  function redirectToLogin () {
    if (!AUTH_PAGE) window.location.replace(loginUrl());
  }

  /* ---- Catálogo base de recetas (fallback local) ---- */
  const DEFAULT_RECIPES = [
    {
      id: 1,
      nombre: 'Ensalada de palta y tomate',
      name: 'Ensalada de palta y tomate',
      tiempo: '20 min',
      time: '20 min',
      porciones: '2 porciones',
      servings: '2 porciones',
      dificultad: 'Baja dif.',
      difficulty: 'Baja dif.',
      tags: ['sugeridas', 'rapidas'],
      initial: 'P',
      color: '#A71619',
      texto_ahorro: 'Esta receta salva 2 ingredientes que vencen pronto: Palta y Tomate.',
      savesText: 'Esta receta salva 2 ingredientes que vencen pronto: Palta y Tomate.',
      ingredientes_salvados: ['Palta', 'Tomate'],
      savedIngredients: ['Palta', 'Tomate'],
      ingredientes: [
        { name: '1 Palta madura', urgent: true },
        { name: '2 Tomates medianos', urgent: true },
        { name: '1/2 Cebolla roja en juliana', urgent: false },
        { name: 'Jugo de 1 limón fresco', urgent: false },
        { name: 'Sal y aceite de oliva al gusto', urgent: false }
      ],
      pasos: [
        'Corta la palta por la mitad, retira la pepa y corta la pulpa en cubos parejos.',
        'Lava y corta los tomates en cuadrados del mismo tamaño.',
        'Corta la cebolla roja en juliana fina y lávala con agua fría y sal para quitar el amargor.',
        'Mezcla todo con cuidado en un bol, añade jugo de limón, sal y un buen chorro de aceite de oliva.'
      ],
      steps: [
        'Corta la palta por la mitad, retira la pepa y corta la pulpa en cubos parejos.',
        'Lava y corta los tomates en cuadrados del mismo tamaño.',
        'Corta la cebolla roja en juliana fina y lávala con agua fría y sal para quitar el amargor.',
        'Mezcla todo con cuidado en un bol, añade jugo de limón, sal y un buen chorro de aceite de oliva.'
      ]
    },
    {
      id: 2,
      nombre: 'Tortilla de verduras',
      name: 'Tortilla de verduras',
      tiempo: '15 min',
      time: '15 min',
      porciones: '2 porciones',
      servings: '2 porciones',
      dificultad: 'Baja dif.',
      difficulty: 'Baja dif.',
      tags: ['sugeridas', 'rapidas'],
      initial: 'T',
      color: '#1E7A46',
      texto_ahorro: 'Aprovecha tus tomates y lechuga fresca antes de que pierdan textura.',
      savesText: 'Aprovecha tus tomates y lechuga fresca antes de que pierdan textura.',
      ingredientes_salvados: ['Tomate', 'Lechuga'],
      savedIngredients: ['Tomate', 'Lechuga'],
      ingredientes: [
        { name: '1 Tomate picado en cubos', urgent: true },
        { name: '1 taza de Lechuga picada fina', urgent: true },
        { name: '2 Huevos frescos', urgent: false },
        { name: '1 pizca de sal, pimienta y orégano', urgent: false },
        { name: '1 cucharada de aceite para la sartén', urgent: false }
      ],
      pasos: [
        'Pica el tomate en cuadraditos y corta la lechuga en tiras delgadas.',
        'Bate los 2 huevos en un plato hondo con sal, pimienta y orégano.',
        'Añade las verduras picadas al huevo batido e integra suavemente.',
        'Calienta una sartén con aceite a fuego medio, vierte la mezcla y cocina 3 minutos por lado hasta que quede dorada.'
      ],
      steps: [
        'Pica el tomate en cuadraditos y corta la lechuga en tiras delgadas.',
        'Bate los 2 huevos en un plato hondo con sal, pimienta y orégano.',
        'Añade las verduras picadas al huevo batido e integra suavemente.',
        'Calienta una sartén con aceite a fuego medio, vierte la mezcla y cocina 3 minutos por lado hasta que quede dorada.'
      ]
    },
    {
      id: 3,
      nombre: 'Sopa de verduras reconfortante',
      name: 'Sopa de verduras reconfortante',
      tiempo: '35 min',
      time: '35 min',
      porciones: '4 porciones',
      servings: '4 porciones',
      dificultad: 'Media dif.',
      difficulty: 'Media dif.',
      tags: ['sugeridas'],
      initial: 'S',
      color: '#F5A524',
      texto_ahorro: 'Aprovecha verduras maduras y dale un toque cítrico con limón fresco.',
      savesText: 'Aprovecha verduras maduras y dale un toque cítrico con limón fresco.',
      ingredientes_salvados: ['Tomate', 'Limón'],
      savedIngredients: ['Tomate', 'Limón'],
      ingredientes: [
        { name: '2 Tomates picados', urgent: true },
        { name: '1 Limón (para el toque final)', urgent: false },
        { name: '1 taza de verduras variadas picadas', urgent: false },
        { name: '1 litro de agua o caldo vegetal', urgent: false },
        { name: '1 diente de ajo y pizca de sal', urgent: false }
      ],
      pasos: [
        'En una olla con una cucharadita de aceite dora el ajo picado.',
        'Añade los tomates y las verduras picadas, sofriendo a fuego medio por 4 minutos.',
        'Vierte el caldo o agua, sazona con sal y hierve tapado a fuego suave por 25 minutos.',
        'Sirve bien caliente con unas gotas de jugo de limón para realzar el sabor.'
      ],
      steps: [
        'En una olla con una cucharadita de aceite dora el ajo picado.',
        'Añade los tomates y las verduras picadas, sofriendo a fuego medio por 4 minutos.',
        'Vierte el caldo o agua, sazona con sal y hierve tapado a fuego suave por 25 minutos.',
        'Sirve bien caliente con unas gotas de jugo de limón para realzar el sabor.'
      ]
    },
    {
      id: 4,
      nombre: 'Guacamole casero',
      name: 'Guacamole casero',
      tiempo: '10 min',
      time: '10 min',
      porciones: '3 porciones',
      servings: '3 porciones',
      dificultad: 'Muy fácil',
      difficulty: 'Muy fácil',
      tags: ['rapidas'],
      initial: 'G',
      color: '#2F9E5B',
      texto_ahorro: 'Usa la palta madura al instante junto con limón fresco.',
      savesText: 'Usa la palta madura al instante junto con limón fresco.',
      ingredientes_salvados: ['Palta', 'Limón'],
      savedIngredients: ['Palta', 'Limón'],
      ingredientes: [
        { name: '2 Paltas maduras', urgent: true },
        { name: 'Jugo de 1 limón', urgent: false },
        { name: '1 Tomate picado sin semillas', urgent: false },
        { name: '1 cucharada de cilantro picado', urgent: false },
        { name: 'Sal al gusto', urgent: false }
      ],
      pasos: [
        'Corta las paltas por la mitad, desecha la pepa y tritura la pulpa con un tenedor.',
        'Vierte inmediatamente el jugo de limón para evitar que se oscurezca.',
        'Incorpora el tomate en cubitos y el cilantro.',
        'Ajusta con sal al gusto y sirve con tostadas o galletas integrales.'
      ],
      steps: [
        'Corta las paltas por la mitad, desecha la pepa y tritura la pulpa con un tenedor.',
        'Vierte inmediatamente el jugo de limón para evitar que se oscurezca.',
        'Incorpora el tomate en cubitos y el cilantro.',
        'Ajusta con sal al gusto y sirve con tostadas o galletas integrales.'
      ]
    },
    {
      id: 5,
      nombre: 'Batido saludable de manzana y yogur',
      name: 'Batido saludable de manzana y yogur',
      tiempo: '5 min',
      time: '5 min',
      porciones: '2 porciones',
      servings: '2 porciones',
      dificultad: 'Muy fácil',
      difficulty: 'Muy fácil',
      tags: ['rapidas'],
      initial: 'B',
      color: '#6B48A3',
      texto_ahorro: 'Usa las manzanas y yogur de tu despensa para un snack refrescante.',
      savesText: 'Usa las manzanas y yogur de tu despensa para un snack refrescante.',
      ingredientes_salvados: ['Manzana', 'Yogur'],
      savedIngredients: ['Manzana', 'Yogur'],
      ingredientes: [
        { name: '2 Manzanas cortadas en dados', urgent: true },
        { name: '1 taza de Yogur natural', urgent: true },
        { name: '1 cucharadita de miel o canela', urgent: false },
        { name: 'Cubos de hielo al gusto', urgent: false }
      ],
      pasos: [
        'Lava las manzanas, retira el centro y córtalas con cáscara para aprovechar la fibra.',
        'Coloca las manzanas y el yogur en la licuadora.',
        'Agrega la miel o canela y un par de cubos de hielo.',
        'Licúa a potencia alta durante 1 minuto hasta obtener una mezcla cremosa y homogénea.'
      ],
      steps: [
        'Lava las manzanas, retira el centro y córtalas con cáscara para aprovechar la fibra.',
        'Coloca las manzanas y el yogur en la licuadora.',
        'Agrega la miel o canela y un par de cubos de hielo.',
        'Licúa a potencia alta durante 1 minuto hasta obtener una mezcla cremosa y homogénea.'
      ]
    },
    {
      id: 6,
      nombre: 'Arroz salteado con verduras',
      name: 'Arroz salteado con verduras',
      tiempo: '15 min',
      time: '15 min',
      porciones: '2 porciones',
      servings: '2 porciones',
      dificultad: 'Fácil',
      difficulty: 'Fácil',
      tags: ['rapidas'],
      initial: 'A',
      color: '#D3B38D',
      texto_ahorro: 'Rescata el arroz y vegetales de tu alacena en un delicioso salteado.',
      savesText: 'Rescata el arroz y vegetales de tu alacena en un delicioso salteado.',
      ingredientes_salvados: ['Arroz', 'Tomate'],
      savedIngredients: ['Arroz', 'Tomate'],
      ingredientes: [
        { name: '1 taza de Arroz cocido', urgent: false },
        { name: '1 Tomate en juliana', urgent: true },
        { name: '1 Huevo batido', urgent: false },
        { name: '1 cucharada de sillao o salsa de soya', urgent: false },
        { name: 'Cebolla o verduras al gusto', urgent: false }
      ],
      pasos: [
        'En una sartén caliente con poco aceite, vierte el huevo batido y revuelve rápidamente.',
        'Agrega el arroz cocido y remueve a fuego alto para que tome temperatura.',
        'Añade el tomate y un chorrito de sillao, salteando durante 2 minutos.',
        'Retira del fuego y sirve de inmediato mientras esté crujiente.'
      ],
      steps: [
        'En una sartén caliente con poco aceite, vierte el huevo batido y revuelve rápidamente.',
        'Agrega el arroz cocido y remueve a fuego alto para que tome temperatura.',
        'Añade el tomate y un chorrito de sillao, salteando durante 2 minutos.',
        'Retira del fuego y sirve de inmediato mientras esté crujiente.'
      ]
    }
  ];

  /* ---- Ayudantes de Almacenamiento Local (Cache) ---- */
  function load (key, fallback) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  function save (key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  /* ---- Sesión, usuario y almacenamiento por usuario ---- */
  function getToken () {
    try { return localStorage.getItem(KEYS.TOKEN) || ''; } catch { return ''; }
  }

  function setToken (token) {
    try {
      if (token) localStorage.setItem(KEYS.TOKEN, token);
      else localStorage.removeItem(KEYS.TOKEN);
    } catch (e) {
      console.warn('No se pudo guardar la sesión:', e);
    }
  }

  function normalizeUser (raw) {
    if (!raw) return null;
    return {
      id: raw.id || raw.usuario_id || null,
      name: raw.name || raw.nombre || '',
      email: raw.email || '',
      username: raw.username || raw.usuario || '',
      fecha_registro: raw.fecha_registro || null
    };
  }

  function currentUserId () {
    const user = load(KEYS.USER, null);
    return user && user.id ? String(user.id) : 'anon';
  }

  function scopedKey (key) {
    return key + '_u' + currentUserId();
  }

  function loadData (key, fallback) {
    return load(scopedKey(key), fallback);
  }

  function saveData (key, value) {
    save(scopedKey(key), value);
  }

  function setSession (token, usuario) {
    const user = normalizeUser(usuario);
    setToken(token);
    if (user) save(KEYS.USER, user);
  }

  function clearSession () {
    setToken('');
    try { localStorage.removeItem(KEYS.USER); } catch (e) {}
  }

  function isAuthenticated () {
    return !!getToken() && !!load(KEYS.USER, null);
  }

  function parseErrorMessage (json, fallback) {
    return (json && (json.message || json.error)) || fallback;
  }

  async function authRequest (path, payload) {
    let res;
    try {
      res = await fetch(API_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
    } catch (e) {
      throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté activo.');
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(parseErrorMessage(json, 'No se pudo completar la operación.'));
    }
    return json;
  }

  async function login (identifier, password) {
    const json = await authRequest('/auth/login', { identifier: identifier, password: password });
    setSession(json.token, json.data);
    return json.data;
  }

  async function register (payload) {
    const json = await authRequest('/auth/registro', payload);
    setSession(json.token, json.data);
    return json.data;
  }

  function logout () {
    clearSession();
    redirectToLogin();
  }

  function apiFetch (path, options) {
    const opts = Object.assign({}, options || {});
    opts.headers = Object.assign({}, opts.headers || {});

    const token = getToken();
    if (token) opts.headers.Authorization = 'Bearer ' + token;

    if (opts.body && typeof opts.body === 'string' && !opts.headers['Content-Type']) {
      opts.headers['Content-Type'] = 'application/json';
    }

    const url = /^https?:\/\//i.test(path) ? path : API_BASE + path;

    return fetch(url, opts).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        clearSession();
        redirectToLogin();
        throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
      }
      return res;
    });
  }

  function today () {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function daysUntil (dateStr) {
    if (!dateStr) return 999;
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const exp = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return Math.round((exp - today()) / 86400000);
    }
    const exp = new Date(cleanStr);
    exp.setHours(0, 0, 0, 0);
    return Math.round((exp - today()) / 86400000);
  }

  function addDays (n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  function badgeInfo (days) {
    if (days <= 0) return { text: 'Vence hoy', cls: 'badge-urgent' };
    if (days === 1) return { text: 'Vence mañana', cls: 'badge-warning' };
    if (days <= 3)  return { text: 'En ' + days + ' días', cls: 'badge-ok' };
    return { text: 'En ' + days + ' días', cls: 'badge-safe' };
  }

  const AVATAR_COLORS = [
    '#A71619', '#1E7A46', '#F5A524', '#2F9E5B',
    '#55665B', '#6B48A3', '#D3B38D', '#0B6E4F', '#C0392B'
  ];

  function avatarColor (name) {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  /* ============ INICIALIZACIÓN Y CACHÉ ============ */
  function initSampleData () {
    // Cada usuario empieza con su propia despensa vacía.
    // El catálogo de recetas se usa como respaldo local, no como inventario.
    if (!getToken()) return;
    if (!loadData(KEYS.FOODS, null)) saveData(KEYS.FOODS, []);
    if (!loadData(KEYS.FAVORITES, null)) saveData(KEYS.FAVORITES, []);
    if (!loadData(KEYS.COOKED, null)) saveData(KEYS.COOKED, []);
  }

  /* ============ SINCRONIZACIÓN CON BACKEND (NEON POSTGRESQL) ============ */
  async function syncFromBackend () {
    if (!getToken()) return;

    try {
      console.log('🔄 Sincronizando con Backend PostgreSQL (Neon)...');

      // 0. Refrescar primero el usuario para que la caché use su espacio aislado
      const resUser = await apiFetch('/usuario');
      if (resUser.ok) {
        const jsonUser = await resUser.json();
        if (jsonUser.success && jsonUser.data) {
          save(KEYS.USER, normalizeUser(jsonUser.data));
        }
      }

      // 1. Si hay alimentos pendientes creados offline (ID temporal de timestamp), sincronizarlos primero
      const localFoods = loadData(KEYS.FOODS, []);
      if (Array.isArray(localFoods)) {
        const pendingOffline = localFoods.filter(function (f) {
          return typeof f.id === 'number' && f.id > 1000000000;
        });
        for (const item of pendingOffline) {
          try {
            await apiFetch('/alimentos', {
              method: 'POST',
              body: JSON.stringify({
                nombre: item.name,
                categoria: item.category,
                cantidad: item.qty || 1,
                ubicacion: item.location || 'refrigeradora',
                fecha_vencimiento: item.expDate || item.fecha_vencimiento,
                notas: item.notas || '',
                imagen: item.image || null
              })
            });
            console.log(`✅ Alimento pendiente "${item.name}" subido con éxito a Neon.`);
          } catch (upErr) {
            console.warn('No se pudo subir alimento pendiente aún:', upErr.message);
          }
        }
      }

      // 1. Alimentos del usuario autenticado
      const resFoods = await apiFetch('/alimentos');
      if (resFoods.ok) {
        const json = await resFoods.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped = json.data.map((f) => ({
            id: f.id,
            name: f.nombre,
            category: f.categoria,
            qty: f.cantidad,
            location: f.ubicacion,
            expDate: f.fecha_vencimiento,
            notas: f.notas,
            image: f.imagen,
            color: f.color || avatarColor(f.nombre),
            initial: f.inicial || (f.nombre ? f.nombre.charAt(0).toUpperCase() : 'A')
          }));
          saveData(KEYS.FOODS, mapped);
          console.log(`✅ ${mapped.length} alimentos sincronizados desde Neon.`);
        }
      }

      // 3. Recetas y Favoritos
      const resRecetas = await apiFetch('/recetas');
      if (resRecetas.ok) {
        const jsonR = await resRecetas.json();
        if (jsonR.success && Array.isArray(jsonR.data)) {
          const favs = [];
          const recipesMapped = jsonR.data.map((r) => {
            // Mantener como string para soportar IDs externos (peru_01, ia_xxx)
            if (r.es_favorita) favs.push(String(r.receta_id_externo || r.id));
            return {
              id: r.id,
              name: r.nombre,
              nombre: r.nombre,
              time: r.tiempo,
              tiempo: r.tiempo,
              servings: r.porciones,
              porciones: r.porciones,
              difficulty: r.dificultad,
              dificultad: r.dificultad,
              tags: r.tags || [],
              color: r.color,
              initial: r.inicial,
              savesText: r.texto_ahorro,
              texto_ahorro: r.texto_ahorro,
              savedIngredients: r.ingredientes_salvados || [],
              ingredientes_salvados: r.ingredientes_salvados || [],
              ingredients: r.ingredientes || [],
              ingredientes: r.ingredientes || [],
              steps: r.pasos || [],
              pasos: r.pasos || [],
              es_favorita: r.es_favorita,
              receta_id_externo: r.receta_id_externo
            };
          });
          saveData(KEYS.RECIPES, recipesMapped);
          saveData(KEYS.FAVORITES, favs);
        }
      }

      // 4. Estadísticas
      const resStats = await apiFetch('/estadisticas');
      if (resStats.ok) {
        const jsonS = await resStats.json();
        if (jsonS.success && jsonS.data) {
          saveData(KEYS.STATS, jsonS.data);
        }
      }

      // Actualizar UI global y avisar a los scripts de página
      syncUI();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zw:synced'));
      }

    } catch (err) {
      console.warn('ℹ️ Servidor backend no alcanzable en este momento. Usando datos locales de respaldo.', err.message);
    }
  }

  /* ============ ALIMENTOS (CRUD CON BACKEND) ============ */
  function getFoods () {
    return loadData(KEYS.FOODS, []);
  }

  function saveFoods (foods) {
    saveData(KEYS.FOODS, foods);
  }

  function getFoodsWithStatus () {
    return getFoods().map(function (f) {
      const days = daysUntil(f.expDate || f.fecha_vencimiento);
      return Object.assign({}, f, { days: days, badge: badgeInfo(days) });
    }).sort(function (a, b) { return a.days - b.days; });
  }

  function getAlertFoods () {
    return getFoodsWithStatus().filter(function (f) { return f.days <= 3; });
  }

  async function addFood (food) {
    const foods = getFoods();
    const tempId = Date.now();
    food.id      = food.id || tempId;
    food.initial = (food.name || '?').charAt(0).toUpperCase();
    food.color   = food.color || avatarColor(food.name || '');
    food.qty     = parseInt(food.qty, 10) || 1;
    food.location = food.location || 'refrigeradora';
    food.notas   = food.notas || '';

    let savedInBackend = false;
    let backendError = null;

    // 1. Guardar en PostgreSQL (Neon) primero
    try {
      const res = await apiFetch('/alimentos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: food.name,
          categoria: food.category,
          cantidad: food.qty,
          ubicacion: food.location,
          fecha_vencimiento: food.expDate,
          notas: food.notas,
          imagen: food.image || null
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          food.id = json.data.id;
          savedInBackend = true;
          console.log(`✅ Alimento guardado en Neon con ID ${food.id}:`, food.name);
        }
      } else {
        const errJson = await res.json().catch(function () { return {}; });
        backendError = errJson.message || `HTTP ${res.status}`;
        console.warn('Aviso: el servidor respondió con error:', res.status, backendError);
      }
    } catch (e) {
      backendError = e.message;
      console.warn('Aviso: modo offline o servidor no alcanzable al guardar:', e.message);
    }

    // 2. Guardar en la caché local
    const withoutSame = foods.filter(function (f) {
      return f.id !== tempId && f.id !== food.id;
    });
    withoutSame.unshift(food);
    saveFoods(withoutSame);
    syncUI();

    return {
      food: food,
      savedInBackend: savedInBackend,
      error: backendError
    };
  }

  async function removeFood (id, foodName, motivo) {
    const numericId = Number(id);
    const foods = getFoods();
    const itemToDelete = foods.find(function (f) { return Number(f.id) === numericId; });
    const finalName = foodName || (itemToDelete ? itemToDelete.name : '');
    const nameParam = encodeURIComponent(finalName || '');
    const motivoParam = encodeURIComponent(motivo || 'consumido');

    let deletedInBackend = false;
    let backendMessage = '';

    // Sincronizar borrado en PostgreSQL (Neon)
    try {
      const url = `/alimentos/${numericId}?motivo=${motivoParam}${nameParam ? '&nombre=' + nameParam : ''}`;
      const res = await apiFetch(url, {
        method: 'DELETE',
        body: JSON.stringify({ motivo: motivo || 'consumido', nombre: finalName || '' })
      });
      if (res.ok) {
        const json = await res.json();
        deletedInBackend = true;
        backendMessage = json.message || 'Eliminado de Neon';
        console.log(`✅ Alimento "${finalName}" (ID: ${numericId}) eliminado de Neon`);
      } else {
        const errJson = await res.json().catch(function () { return {}; });
        console.warn('Aviso de la base de datos al eliminar:', res.status, errJson);
      }
    } catch (e) {
      console.warn('Borrado en base de datos pospuesto (modo offline):', e.message);
    }

    const updated = foods.filter(function (f) { return Number(f.id) !== numericId; });
    saveFoods(updated);
    syncUI();

    return {
      success: true,
      deletedInBackend: deletedInBackend,
      message: backendMessage,
      remaining: updated
    };
  }

  async function updateFoodQty (id, newQty, motivo) {
    const numericId = Number(id);
    const foods = getFoods();
    const item = foods.find(function (f) { return Number(f.id) === numericId; });
    if (!item) return { success: false, message: 'Alimento no encontrado' };

    const targetQty = Math.max(0, parseInt(newQty, 10));

    // Si la cantidad llega a 0, se registra en el historial y se elimina
    if (targetQty <= 0) {
      return await removeFood(id, item.name, motivo || 'consumido');
    }

    item.qty = targetQty;
    item.cantidad = targetQty;
    saveFoods(foods);
    syncUI();

    let updatedInBackend = false;
    try {
      const res = await apiFetch(`/alimentos/${numericId}`, {
        method: 'PUT',
        body: JSON.stringify({ cantidad: targetQty, motivo: motivo || 'consumido' })
      });
      if (res.ok) {
        updatedInBackend = true;
        console.log(`✅ Cantidad de "${item.name}" actualizada a ${targetQty} en Neon`);
      }
    } catch (e) {
      console.warn('Actualización de cantidad en modo offline:', e.message);
    }

    return {
      success: true,
      updatedInBackend: updatedInBackend,
      food: item,
      qty: targetQty
    };
  }

  /* ============ USUARIO (CRUD CON BACKEND) ============ */
  function getUser () {
    const raw = load(KEYS.USER, null);
    if (!raw) return { id: null, name: '', email: '', username: '' };
    return normalizeUser(raw);
  }

  async function saveUser (u) {
    const current = getUser();
    const updated = Object.assign({}, current, u);
    save(KEYS.USER, normalizeUser(updated));
    syncUI();

    try {
      const res = await apiFetch('/usuario', {
        method: 'PUT',
        body: JSON.stringify({ nombre: updated.name, email: updated.email })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          save(KEYS.USER, normalizeUser(json.data));
          syncUI();
        }
      }
    } catch (e) {
      console.warn('Actualización de usuario offline:', e.message);
    }

    return updated;
  }

  /* ============ RECETAS Y FAVORITOS (CON BACKEND E INTELIGENCIA ARTIFICIAL) ============ */
  function getRecipes () {
    return loadData(KEYS.RECIPES, DEFAULT_RECIPES);
  }

  function getRecipe (id) {
    const catalog = getRecipes();
    const strId = String(id);
    return catalog.find(function (r) {
      return String(r.id) === strId || String(r.receta_id_externo) === strId;
    }) || catalog[0];
  }

  async function getRecipeDetail (id) {
    try {
      const res = await apiFetch(`/recetas/${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Detalle offline:', e.message);
    }
    return getRecipe(id);
  }

  async function fetchRecommendations (filtro = 'todas', busqueda = '') {
    try {
      const url = `/recetas/recomendaciones?filtro=${encodeURIComponent(filtro)}&q=${encodeURIComponent(busqueda || '')}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          saveData(KEYS.RECIPES, json.data);
          return json;
        }
      }
    } catch (e) {
      console.warn('Error al obtener recomendaciones remotas:', e.message);
    }
    return { success: false, data: getRecipes() };
  }

  async function generateAiRecipe () {
    try {
      const res = await apiFetch('/recetas/generar-ia', {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const current = getRecipes();
          current.unshift(json.data);
          saveData(KEYS.RECIPES, current);
          return json.data;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Error al generar receta con IA');
      }
    } catch (e) {
      console.error('Error generando receta con IA:', e);
      throw e;
    }
  }

  function getFavorites () {
    return loadData(KEYS.FAVORITES, []);
  }

  function isFavorite (id) {
    const strId = String(id);
    return getFavorites().map(String).includes(strId);
  }

  async function toggleFavorite (id) {
    const strId = String(id);
    const favs = getFavorites().map(String);
    const idx  = favs.indexOf(strId);
    let state = false;

    if (idx >= 0) {
      favs.splice(idx, 1);
      state = false;
    } else {
      favs.push(strId);
      state = true;
    }
    saveData(KEYS.FAVORITES, favs);

    // Enviar a PostgreSQL en segundo plano
    try {
      await apiFetch(`/recetas/${encodeURIComponent(id)}/favorito`, {
        method: 'POST',
        body: JSON.stringify({})
      });
    } catch (e) {
      console.warn('Toggle favorito offline:', e.message);
    }

    return state;
  }

  /* ============ COCINADOS (CON BACKEND) ============ */
  function getCooked () {
    return loadData(KEYS.COOKED, []);
  }

  function isCooked (id) {
    // Comparar como strings para soportar IDs externos (peru_01, ia_xxx, 52940)
    const strId = String(id);
    return getCooked().map(String).includes(strId);
  }

  async function markCooked (id) {
    const strId = String(id);
    const cooked = getCooked().map(String);
    if (!cooked.includes(strId)) {
      cooked.push(strId);
      saveData(KEYS.COOKED, cooked);
    }

    // Enviar al backend (realiza la transacción en PostgreSQL descontando ingredientes)
    try {
      await apiFetch(`/recetas/${encodeURIComponent(strId)}/cocinar`, {
        method: 'POST',
        body: JSON.stringify({ descontar_alimentos: true })
      });
    } catch (e) {
      console.warn('Registro de cocinado offline:', e.message);
    }
  }

  /* ============ ESTADÍSTICAS ============ */
  function getStats () {
    const backendStats = loadData(KEYS.STATS, null);
    if (backendStats) {
      return {
        total: backendStats.total_en_inventario,
        cooked: backendStats.recetas_cocinadas,
        urgentCount: backendStats.alimentos_urgentes_hoy,
        warningCount: Math.max(0, backendStats.alertas_activas - backendStats.alimentos_urgentes_hoy),
        savings: Number(backendStats.dinero_ahorrado_pen),
        kgSaved: Number(backendStats.kg_desperdicio_evitado),
        itemsSaved: backendStats.alimentos_salvados_total,
        logros: backendStats.logros
      };
    }

    // Cálculo local si no hay estadísticas del backend
    const foods = getFoodsWithStatus();
    const cookedCount = getCooked().length;
    const total = foods.length;
    const urgentCount = foods.filter(function (f) { return f.days <= 0; }).length;
    const warningCount = foods.filter(function (f) { return f.days > 0 && f.days <= 3; }).length;

    const savings = 48.00 + (cookedCount * 8.25) + (total * 1.50);
    const kgSaved = 2.6 + (cookedCount * 0.4) + (total * 0.15);
    const itemsSaved = 6 + (cookedCount * 2) + Math.max(0, total - urgentCount);

    return {
      total: total,
      cooked: cookedCount,
      urgentCount: urgentCount,
      warningCount: warningCount,
      savings: Number(savings.toFixed(2)),
      kgSaved: Number(kgSaved.toFixed(1)),
      itemsSaved: itemsSaved,
      logros: {
        principiante: itemsSaved >= 1,
        chef_creativo: cookedCount >= 1,
        heroe_verde: savings >= 50.0
      }
    };
  }

  /* ============ HISTORIAL Y REPORTES ============ */
  async function getHistorial (options) {
    const opts = options || {};
    const params = new URLSearchParams();
    if (opts.limite) params.set('limite', opts.limite);
    if (opts.offset) params.set('offset', opts.offset);
    if (opts.offsetConsumos !== undefined) params.set('offset_consumos', opts.offsetConsumos);
    if (opts.offsetCocinados !== undefined) params.set('offset_cocinados', opts.offsetCocinados);
    if (opts.motivo) params.set('motivo', opts.motivo);

    const res = await apiFetch('/historial' + (params.toString() ? '?' + params.toString() : ''));
    const json = await res.json().catch(function () { return {}; });
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'No se pudo consultar el historial');
    }
    return json.data;
  }

  async function downloadReport (tipo, formato) {
    const tipoSeguro = tipo || 'estadisticas';
    const formatoSeguro = formato === 'excel' ? 'excel' : 'pdf';

    const res = await apiFetch(`/reportes/${tipoSeguro}?formato=${formatoSeguro}`);
    if (!res.ok) {
      let message = 'No se pudo generar el reporte';
      try {
        const json = await res.json();
        message = json.message || message;
      } catch (e) {}
      throw new Error(message);
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    let filename = `ZeroWaste_${tipoSeguro}.${formatoSeguro === 'excel' ? 'xls' : 'pdf'}`;
    const match = /filename=\"?([^\";]+)\"?/i.exec(disposition);
    if (match && match[1]) filename = match[1];

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    return filename;
  }

  /* ============ SINCRONIZADOR GLOBAL DE UI ============ */
  function ensureLogoutUI () {
    const logoutIcon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>' +
        '<polyline points="16 17 21 12 16 7"/>' +
        '<line x1="21" y1="12" x2="9" y2="12"/>' +
      '</svg>';

    document.querySelectorAll('.sidebar').forEach(function (sidebar) {
      if (sidebar.querySelector('.zw-logout-btn')) return;
      let footer = sidebar.querySelector('.sidebar-footer');
      if (!footer) {
        footer = document.createElement('div');
        footer.className = 'sidebar-footer';
        sidebar.appendChild(footer);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sb-nav-item zw-logout-btn';
      btn.innerHTML = logoutIcon + '<span>Cerrar sesión</span>';
      btn.addEventListener('click', logout);
      footer.appendChild(btn);
    });

    function addHeaderLogout (container) {
      if (!container || container.querySelector('.zw-logout-header')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zw-logout-header';
      btn.title = 'Cerrar sesión';
      btn.setAttribute('aria-label', 'Cerrar sesión');
      btn.innerHTML = logoutIcon;
      btn.addEventListener('click', logout);
      container.appendChild(btn);
    }

    document.querySelectorAll('.page-header .ph-actions').forEach(addHeaderLogout);
    document.querySelectorAll('.page-header').forEach(function (header) {
      if (!header.querySelector('.ph-actions')) addHeaderLogout(header);
    });
  }

  function syncUI () {
    const user = getUser();
    const displayName = user.name || 'Usuario';
    const initial = displayName.charAt(0).toUpperCase();

    // Actualizar nombres y avatares en barra lateral
    document.querySelectorAll('.sp-name, #sbUserName').forEach(function (el) {
      el.textContent = displayName;
    });
    document.querySelectorAll('.sp-email, #sbUserEmail').forEach(function (el) {
      if (user.email) el.textContent = user.email;
    });
    document.querySelectorAll('.sp-avatar, #sbAvatar').forEach(function (el) {
      el.textContent = initial;
    });

    // Actualizar badges de alerta
    const alertCount = getAlertFoods().length;
    document.querySelectorAll('#sbBadge, #navBadgeAlertas, .sb-badge').forEach(function (el) {
      if (alertCount > 0) {
        el.textContent = alertCount;
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
      }
    });

    document.querySelectorAll('#mnBadge, #mnBadgeAlertas, .mn-badge').forEach(function (el) {
      if (alertCount > 0) {
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    });

    ensureLogoutUI();
  }

  /* ============ API PÚBLICA ============ */
  return {
    init:               initSampleData,
    syncFromBackend:    syncFromBackend,
    apiFetch:           apiFetch,
    /* sesión */
    login:              login,
    register:           register,
    logout:             logout,
    setSession:         setSession,
    clearSession:       clearSession,
    getToken:           getToken,
    isAuthenticated:    isAuthenticated,
    /* alimentos */
    getFoods:           getFoods,
    saveFoods:          saveFoods,
    getFoodsWithStatus: getFoodsWithStatus,
    getAlertFoods:      getAlertFoods,
    addFood:            addFood,
    removeFood:         removeFood,
    updateFoodQty:      updateFoodQty,
    /* usuario */
    getUser:            getUser,
    saveUser:           saveUser,
    /* favoritos */
    getFavorites:       getFavorites,
    toggleFavorite:     toggleFavorite,
    isFavorite:         isFavorite,
    /* recetas inteligentes */
    getRecipes:           getRecipes,
    getRecipe:            getRecipe,
    getRecipeDetail:      getRecipeDetail,
    fetchRecommendations: fetchRecommendations,
    generateAiRecipe:     generateAiRecipe,
    /* cocinados */
    getCooked:          getCooked,
    isCooked:           isCooked,
    markCooked:         markCooked,
    /* estadísticas e historial */
    getStats:           getStats,
    getHistorial:       getHistorial,
    downloadReport:     downloadReport,
    /* utilidades */
    daysUntil:          daysUntil,
    badgeInfo:          badgeInfo,
    avatarColor:        avatarColor,
    addDays:            addDays,
    syncUI:             syncUI,
    FALLBACK_DISH_SVG:  FALLBACK_DISH_SVG,
  };

})();

// Inicializar caché local y proteger las páginas privadas
ZWStore.init();

(function protegerPagina () {
  const esBienvenida = /\/01-bienvenida\//.test(window.location.pathname);
  if (!ZWStore.getToken() && !esBienvenida) {
    const destino = new URL('../01-bienvenida/index.html', window.location.href).href;
    window.location.replace(destino);
  }
})();

document.addEventListener('DOMContentLoaded', function () {
  const esBienvenida = /\/01-bienvenida\//.test(window.location.pathname);
  if (esBienvenida) return;
  if (!ZWStore.getToken()) return;
  ZWStore.syncUI();
  ZWStore.syncFromBackend();
});

if (typeof window !== "undefined") window.ZW_FALLBACK_DISH_SVG = ZWStore.FALLBACK_DISH_SVG;
