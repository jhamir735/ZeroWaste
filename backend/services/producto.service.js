/* =============================================
   ZeroWaste – Servicio de productos por código de barras
   Archivo: backend/services/producto.service.js

   Orden de búsqueda:
     1) Catálogo de demostración local (productos.demo.data.js)
     2) Caché en memoria (24 h)
     3) Open Food Facts (base de datos abierta de productos; sin clave de API)
   Si nada responde, devuelve found:false y el usuario completa los datos a mano.
   ============================================= */
'use strict';

const DEMO = require('./productos.demo.data');

const POR_CODIGO = new Map(DEMO.map((p) => [p.codigo, p]));
const CACHE = new Map();                       // código → { t, valor }
const CACHE_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 4500;

// Vida útil sugerida por categoría (solo cuando el producto no trae una propia)
const DIAS_POR_CATEGORIA = { frutas: 5, lacteos: 10, carnes: 3, cereales: 180, bebidas: 60, otros: 90 };
const UBICACION_POR_CATEGORIA = { frutas: 'refrigeradora', lacteos: 'refrigeradora', carnes: 'refrigeradora', cereales: 'despensa', bebidas: 'despensa', otros: 'despensa' };

/** Deja solo los dígitos y valida el largo típico de EAN/UPC (8, 12, 13 o 14). */
function normalizarCodigo(valor) {
  const c = String(valor || '').replace(/\D/g, '');
  return [8, 12, 13, 14].includes(c.length) ? c : null;
}

/** Traduce las categorías de Open Food Facts a las 6 categorías de ZeroWaste. */
function categoriaDesdeTags(tags, nombre) {
  const t = (Array.isArray(tags) ? tags.join(' ') : String(tags || '')).toLowerCase() + ' ' + String(nombre || '').toLowerCase();
  if (/(dairies|milk|yogurt|yoghurt|cheese|butter|cream|leche|queso|yogur|mantequilla)/.test(t)) return 'lacteos';
  if (/(meat|fish|seafood|poultry|sausage|ham|tuna|carne|pollo|pescado|atun|atún|jamon|jamón)/.test(t)) return 'carnes';
  if (/(beverage|drink|water|juice|soda|tea|coffee|bebida|jugo|agua|gaseosa|cerveza)/.test(t)) return 'bebidas';
  if (/(fruit|vegetable|salad|fruta|verdura|hortaliza)/.test(t)) return 'frutas';
  if (/(cereal|bread|pasta|rice|legume|bean|lentil|oat|biscuit|cookie|flour|pan |arroz|fideo|avena|galleta|frejol|lenteja|harina)/.test(t)) return 'cereales';
  return 'otros';
}

function armarProducto(base) {
  const cat = base.categoria;
  return {
    codigo: base.codigo,
    nombre: base.nombre,
    marca: base.marca || '',
    categoria: cat,
    cantidad_texto: base.cantidad_texto || '',
    imagen: base.imagen || null,
    dias_sugeridos: base.dias || DIAS_POR_CATEGORIA[cat] || 90,
    ubicacion: base.ubicacion || UBICACION_POR_CATEGORIA[cat] || 'despensa'
  };
}

async function consultarOpenFoodFacts(codigo) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = 'https://world.openfoodfacts.org/api/v2/product/' + codigo +
      '.json?fields=product_name,product_name_es,generic_name,brands,quantity,categories_tags,image_front_small_url';
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'ZeroWaste/1.0 (proyecto academico)' } });
    if (!res.ok) return { error: true };
    const json = await res.json();
    if (json.status !== 1 || !json.product) return { vacio: true };
    const p = json.product;
    const nombre = (p.product_name_es || p.product_name || p.generic_name || '').trim();
    if (!nombre) return { vacio: true };
    const marca = String(p.brands || '').split(',')[0].trim();
    return {
      producto: armarProducto({
        codigo,
        nombre: marca && !nombre.toLowerCase().includes(marca.toLowerCase()) ? nombre + ' · ' + marca : nombre,
        marca,
        categoria: categoriaDesdeTags(p.categories_tags, nombre),
        cantidad_texto: p.quantity || '',
        imagen: p.image_front_small_url || null
      })
    };
  } catch (e) {
    return { error: true };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Busca un producto por código de barras.
 * @returns {Promise<{found:boolean, source?:string, producto?:object, codigo?:string, offline?:boolean, invalido?:boolean}>}
 */
async function buscarPorCodigo(valor) {
  const codigo = normalizarCodigo(valor);
  if (!codigo) return { found: false, invalido: true };

  const demo = POR_CODIGO.get(codigo);
  if (demo) return { found: true, source: 'demo', producto: armarProducto(demo) };

  const guardado = CACHE.get(codigo);
  if (guardado && Date.now() - guardado.t < CACHE_MS) return { found: true, source: 'cache', producto: guardado.valor };

  const r = await consultarOpenFoodFacts(codigo);
  if (r.producto) {
    CACHE.set(codigo, { t: Date.now(), valor: r.producto });
    return { found: true, source: 'openfoodfacts', producto: r.producto };
  }
  return { found: false, codigo, offline: !!r.error };
}

module.exports = { buscarPorCodigo, normalizarCodigo, categoriaDesdeTags };
