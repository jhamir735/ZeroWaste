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
  };

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
    const existing = load(KEYS.FOODS, null);
    if (!existing || existing.length === 0) {
      save(KEYS.FOODS, [
        { id: 1, name: 'Palta',   category: 'frutas',   qty: 2, location: 'refrigeradora', expDate: addDays(0),  initial: 'P', color: '#A71619' },
        { id: 2, name: 'Tomate',  category: 'frutas',   qty: 6, location: 'refrigeradora', expDate: addDays(1),  initial: 'T', color: '#F5A524' },
        { id: 3, name: 'Lechuga', category: 'frutas',   qty: 1, location: 'refrigeradora', expDate: addDays(2),  initial: 'L', color: '#1E7A46' },
        { id: 4, name: 'Manzana', category: 'frutas',   qty: 5, location: 'despensa',      expDate: addDays(5),  initial: 'M', color: '#2F9E5B' },
        { id: 5, name: 'Limón',   category: 'frutas',   qty: 3, location: 'despensa',      expDate: addDays(8),  initial: 'L', color: '#55665B' },
        { id: 6, name: 'Yogur',   category: 'lacteos',  qty: 2, location: 'refrigeradora', expDate: addDays(3),  initial: 'Y', color: '#6B48A3' },
        { id: 7, name: 'Arroz',   category: 'cereales', qty: 1, location: 'despensa',      expDate: addDays(90), initial: 'A', color: '#D3B38D' },
      ]);
    }
    if (!localStorage.getItem(KEYS.USER)) {
      save(KEYS.USER, { id: 1, name: 'María Pérez', email: 'maria@correo.com' });
    }
    if (!localStorage.getItem(KEYS.FAVORITES)) {
      save(KEYS.FAVORITES, [1]);
    }
    if (!localStorage.getItem(KEYS.COOKED)) {
      save(KEYS.COOKED, []);
    }
    if (!localStorage.getItem(KEYS.RECIPES)) {
      save(KEYS.RECIPES, DEFAULT_RECIPES);
    }
  }

  /* ============ SINCRONIZACIÓN CON BACKEND (NEON POSTGRESQL) ============ */
  async function syncFromBackend () {
    try {
      console.log('🔄 Sincronizando con Backend PostgreSQL (Neon)...');

      // 0. Si hay alimentos pendientes creados offline (ID temporal de timestamp), sincronizarlos primero a Neon
      const localFoods = load(KEYS.FOODS, []);
      if (Array.isArray(localFoods)) {
        const pendingOffline = localFoods.filter(function (f) {
          return typeof f.id === 'number' && f.id > 1000000000;
        });
        for (const item of pendingOffline) {
          try {
            await fetch(`${API_BASE}/alimentos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                usuario_id: 1,
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

      // 1. Alimentos desde PostgreSQL
      const resFoods = await fetch(`${API_BASE}/alimentos`);
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
          save(KEYS.FOODS, mapped);
          console.log(`✅ ${mapped.length} alimentos sincronizados desde Neon.`);
        }
      }

      // 2. Usuario
      const resUser = await fetch(`${API_BASE}/usuario?id=1`);
      if (resUser.ok) {
        const jsonUser = await resUser.json();
        if (jsonUser.success && jsonUser.data) {
          save(KEYS.USER, jsonUser.data);
        }
      }

      // 3. Recetas y Favoritos
      const resRecetas = await fetch(`${API_BASE}/recetas?usuario_id=1`);
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
              es_favorita: r.es_favorita
            };
          });
          save(KEYS.RECIPES, recipesMapped);
          save(KEYS.FAVORITES, favs);
        }
      }

      // 4. Estadísticas
      const resStats = await fetch(`${API_BASE}/estadisticas?usuario_id=1`);
      if (resStats.ok) {
        const jsonS = await resStats.json();
        if (jsonS.success && jsonS.data) {
          save(KEYS.STATS, jsonS.data);
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
    return load(KEYS.FOODS, []);
  }

  function saveFoods (foods) {
    save(KEYS.FOODS, foods);
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
      const res = await fetch(`${API_BASE}/alimentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: 1,
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

  async function removeFood (id, foodName) {
    const numericId = Number(id);
    const foods = getFoods();
    const itemToDelete = foods.find(function (f) { return Number(f.id) !== numericId; });
    const finalName = foodName || (itemToDelete ? itemToDelete.name : '');
    const nameParam = encodeURIComponent(finalName || '');

    let deletedInBackend = false;
    let backendMessage = '';

    // Sincronizar borrado en PostgreSQL (Neon)
    try {
      const url = `${API_BASE}/alimentos/${numericId}${nameParam ? '?nombre=' + nameParam : ''}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
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

  async function updateFoodQty (id, newQty) {
    const numericId = Number(id);
    const foods = getFoods();
    const item = foods.find(function (f) { return Number(f.id) === numericId; });
    if (!item) return { success: false, message: 'Alimento no encontrado' };

    const targetQty = Math.max(0, parseInt(newQty, 10));

    // Si la cantidad llega a 0, se elimina/consume completamente
    if (targetQty <= 0) {
      return await removeFood(id, item.name);
    }

    item.qty = targetQty;
    item.cantidad = targetQty;
    saveFoods(foods);
    syncUI();

    let updatedInBackend = false;
    try {
      const res = await fetch(`${API_BASE}/alimentos/${numericId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: targetQty })
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
    return load(KEYS.USER, { id: 1, name: 'María Pérez', email: 'maria@correo.com' });
  }

  async function saveUser (u) {
    const current = getUser();
    const updated = Object.assign({}, current, u);
    save(KEYS.USER, updated);
    syncUI();

    try {
      await fetch(`${API_BASE}/usuario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1, nombre: updated.name, email: updated.email })
      });
    } catch (e) {
      console.warn('Actualización de usuario offline:', e.message);
    }

    return updated;
  }

  /* ============ RECETAS Y FAVORITOS (CON BACKEND E INTELIGENCIA ARTIFICIAL) ============ */
  function getRecipes () {
    return load(KEYS.RECIPES, DEFAULT_RECIPES);
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
      const res = await fetch(`${API_BASE}/recetas/${id}?usuario_id=1`);
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
      const url = `${API_BASE}/recetas/recomendaciones?usuario_id=1&filtro=${encodeURIComponent(filtro)}&q=${encodeURIComponent(busqueda || '')}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          save(KEYS.RECIPES, json.data);
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
      const res = await fetch(`${API_BASE}/recetas/generar-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: 1 })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const current = getRecipes();
          current.unshift(json.data);
          save(KEYS.RECIPES, current);
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
    return load(KEYS.FAVORITES, []);
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
    save(KEYS.FAVORITES, favs);

    // Enviar a PostgreSQL en segundo plano
    try {
      await fetch(`${API_BASE}/recetas/${encodeURIComponent(id)}/favorito`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: 1 })
      });
    } catch (e) {
      console.warn('Toggle favorito offline:', e.message);
    }

    return state;
  }

  /* ============ COCINADOS (CON BACKEND) ============ */
  function getCooked () {
    return load(KEYS.COOKED, []);
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
      save(KEYS.COOKED, cooked);
    }

    // Enviar al backend (realiza la transacción en PostgreSQL descontando ingredientes)
    try {
      await fetch(`${API_BASE}/recetas/${encodeURIComponent(strId)}/cocinar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: 1, descontar_alimentos: true })
      });
    } catch (e) {
      console.warn('Registro de cocinado offline:', e.message);
    }
  }

  /* ============ ESTADÍSTICAS ============ */
  function getStats () {
    const backendStats = load(KEYS.STATS, null);
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

  /* ============ SINCRONIZADOR GLOBAL DE UI ============ */
  function syncUI () {
    const user = getUser();
    const initial = (user.name || 'M').charAt(0).toUpperCase();

    // Actualizar nombres y avatares en barra lateral
    document.querySelectorAll('.sp-name, #sbUserName').forEach(function (el) {
      el.textContent = user.name;
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
  }

  /* ============ API PÚBLICA ============ */
  return {
    init:               initSampleData,
    syncFromBackend:    syncFromBackend,
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
    /* estadísticas */
    getStats:           getStats,
    /* utilidades */
    daysUntil:          daysUntil,
    badgeInfo:          badgeInfo,
    avatarColor:        avatarColor,
    addDays:            addDays,
    syncUI:             syncUI,
    FALLBACK_DISH_SVG:  FALLBACK_DISH_SVG,
  };

})();

// Inicializar caché local e intentar sincronización en segundo plano con Neon
ZWStore.init();

document.addEventListener('DOMContentLoaded', function () {
  ZWStore.syncUI();
  ZWStore.syncFromBackend();
});

if (typeof window !== "undefined") window.ZW_FALLBACK_DISH_SVG = ZWStore.FALLBACK_DISH_SVG;
