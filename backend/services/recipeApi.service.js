/* =============================================
   ZeroWaste – Recipe API Service (TheMealDB & External APIs)
   Archivo: backend/services/recipeApi.service.js
   Cumple con términos de uso oficiales sin web scraping
   ============================================= */
'use strict';

const CacheService = require('./cache.service');
const PERUVIAN_RECIPES = require('./peruvianRecipes.data');

// Diccionario de traducción de ingredientes comunes (Español <-> Inglés) para TheMealDB
const INGREDIENT_TRANSLATIONS = {
  'pollo': 'chicken',
  'pechuga de pollo': 'chicken breast',
  'carne': 'beef',
  'carne molida': 'minced beef',
  'pescado': 'fish',
  'filete de pescado': 'salmon',
  'tomate': 'tomato',
  'tomates': 'tomato',
  'cebolla': 'onion',
  'cebolla roja': 'red onion',
  'papa': 'potato',
  'papa amarilla': 'potato',
  'papas': 'potatoes',
  'arroz': 'rice',
  'huevo': 'egg',
  'huevos': 'eggs',
  'queso': 'cheese',
  'queso fresco': 'cheese',
  'leche': 'milk',
  'limon': 'lemon',
  'limones': 'lemon',
  'palta': 'avocado',
  'aguacate': 'avocado',
  'espinaca': 'spinach',
  'lechuga': 'lettuce',
  'zanahoria': 'carrot',
  'manzana': 'apple',
  'platano': 'banana',
  'avena': 'oats',
  'fideos': 'noodles',
  'espagueti': 'spaghetti',
  'yogur': 'yogurt',
  'yogurt': 'yogurt',
  'ajo': 'garlic'
};

class RecipeApiService {
  /**
   * Traduce un ingrediente del inglés al español
   */
  static translateToSpanish (englishWord) {
    if (!englishWord) return '';
    const clean = englishWord.toLowerCase().trim();
    for (const [es, en] of Object.entries(INGREDIENT_TRANSLATIONS)) {
      if (clean === en || clean.includes(en)) {
        return es.charAt(0).toUpperCase() + es.slice(1);
      }
    }
    // Traducciones adicionales comunes de TheMealDB
    const extra = {
      'soy sauce': 'Sillao / Salsa de soya',
      'brown sugar': 'Azúcar rubia',
      'ground ginger': 'Kion / Jengibre molido',
      'ginger': 'Kion / Jengibre fresco',
      'cornstarch': 'Maicena / Fécula de maíz',
      'stir-fry vegetables': 'Verduras surtidas para saltear',
      'sesame seed': 'Ajonjolí / Semillas de sésamo',
      'sesame oil': 'Aceite de ajonjolí',
      'green onions': 'Cebollita china / Cebolleta',
      'spring onions': 'Cebolla china',
      'teriyaki': 'Salsa Teriyaki',
      'mirin': 'Mirin / Vinagre de arroz dulce',
      'beef': 'Carne de res',
      'minced beef': 'Carne molida',
      'ground beef': 'Carne molida',
      'chicken breast': 'Pechuga de pollo',
      'chicken': 'Pollo',
      'flour': 'Harina',
      'sugar': 'Azúcar',
      'salt': 'Sal',
      'pepper': 'Pimienta',
      'black pepper': 'Pimienta negra',
      'butter': 'Mantequilla',
      'olive oil': 'Aceite de oliva',
      'vegetable oil': 'Aceite vegetal',
      'garlic clove': 'Diente de ajo',
      'cloves of garlic': 'Dientes de ajo',
      'water': 'Agua',
      'parsley': 'Perejil',
      'cilantro': 'Culantro / Cilantro',
      'coriander': 'Cilantro',
      'cream': 'Crema de leche',
      'bread': 'Pan'
    };
    for (const [k, v] of Object.entries(extra)) {
      if (clean.includes(k)) return v;
    }
    return englishWord;
  }

  /**
   * Traduce instrucciones del inglés al español para que siempre se lean en español
   */
  static translateStepToSpanish (stepText) {
    if (!stepText || typeof stepText !== 'string') return '';
    let p = stepText.trim();

    // Reglas de traducción culinaria inglés -> español
    const repl = [
      [/preheat (the )?oven to (\d+)[° ]?c/gi, 'Precalienta el horno a $2°C'],
      [/preheat (the )?oven to (\d+)[° ]?f/gi, 'Precalienta el horno a $2°F (aprox. 180°C)'],
      [/preheat (the )?oven/gi, 'Precalienta el horno a temperatura media'],
      [/bring (a large pot of water )?to a boil/gi, 'Pon a hervir una olla grande con agua y sal'],
      [/heat (the )?(olive |vegetable )?oil in a (large )?(pan|skillet|pot|wok)/gi, 'Calienta aceite en una sartén a fuego medio'],
      [/in a (large )?(bowl|pan|pot),? (mix|combine|whisk|stir together)/gi, 'En un tazón grande, mezcla'],
      [/season with salt and pepper/gi, 'sazona con sal y pimienta al gusto'],
      [/season to taste/gi, 'sazona al gusto'],
      [/reduce heat and simmer/gi, 'reduce a fuego bajo y deja cocinar a fuego lento'],
      [/cook (for )?(\d+)[- ](\d+)? ?(minutes?|mins?)/gi, 'cocina durante $2-$3 minutos'],
      [/cook for (\d+) (minutes?|mins?)/gi, 'cocina durante $1 minutos'],
      [/bake for (\d+)[- ](\d+)? ?(minutes?|mins?)/gi, 'hornea durante $1-$2 minutos'],
      [/bake for (\d+) (minutes?|mins?)/gi, 'hornea durante $1 minutos'],
      [/until golden (brown)?/gi, 'hasta que esté bien dorado'],
      [/until tender/gi, 'hasta que quede suave'],
      [/stir occasionally/gi, 'removiendo ocasionalmente para evitar que se pegue'],
      [/stir continuously/gi, 'removiendo constantemente'],
      [/stir well/gi, 'mezclando todo muy bien'],
      [/drain and set aside/gi, 'cuela y reserva'],
      [/set aside/gi, 'reserva para después'],
      [/garnish with/gi, 'decora al servir con'],
      [/serve hot with/gi, 'sirve caliente acompañado de'],
      [/serve immediately/gi, 'sirve de inmediato bien caliente'],
      [/serve with/gi, 'sirve con'],
      [/finely chop(ped)?/gi, 'pica finamente'],
      [/roughly chop(ped)?/gi, 'corta en trozos'],
      [/cut into (cubes|pieces|slices)/gi, 'corta en dados o rodajas'],
      [/medium heat/gi, 'fuego medio'],
      [/high heat/gi, 'fuego alto'],
      [/low heat/gi, 'fuego bajo'],
      [/chicken breast/gi, 'pechuga de pollo'],
      [/chicken/gi, 'pollo'],
      [/onions?/gi, 'cebolla'],
      [/garlic/gi, 'ajo'],
      [/tomatoes?/gi, 'tomate'],
      [/potatoes?/gi, 'papas'],
      [/fish/gi, 'pescado'],
      [/rice/gi, 'arroz'],
      [/eggs?/gi, 'huevo'],
      [/milk/gi, 'leche'],
      [/butter/gi, 'mantequilla'],
      [/flour/gi, 'harina'],
      [/minutes?/gi, 'minutos'],
      [/seconds?/gi, 'segundos'],
      [/hours?/gi, 'horas'],
      [/tablespoons?/gi, 'cucharadas'],
      [/teaspoons?/gi, 'cucharaditas']
    ];

    repl.forEach(([regex, rep]) => {
      p = p.replace(regex, rep);
    });

    return p.charAt(0).toUpperCase() + p.slice(1);
  }

  /**
   * Traduce un ingrediente del español al inglés para consultar TheMealDB
   */
  static translateToEnglish (ingredientName) {
    if (!ingredientName) return null;
    const clean = ingredientName.toLowerCase().trim();
    for (const [es, en] of Object.entries(INGREDIENT_TRANSLATIONS)) {
      if (clean.includes(es) || es.includes(clean)) {
        return en;
      }
    }
    return clean;
  }

  /**
   * Consulta TheMealDB por un ingrediente específico (API oficial gratuita)
   */
  static async fetchFromMealDBByIngredient (ingredientEnglish) {
    try {
      const baseUrl = process.env.THEMEALDB_API_URL || 'https://www.themealdb.com/api/json/v1/1';
      const url = `${baseUrl}/filter.php?i=${encodeURIComponent(ingredientEnglish)}`;
      
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) return [];

      const data = await response.json();
      if (!data || !Array.isArray(data.meals)) return [];

      return data.meals.slice(0, 4); // Limitar a los 4 mejores para rendimiento óptimo
    } catch (err) {
      console.warn(`Error al consultar TheMealDB para "${ingredientEnglish}":`, err.message);
      return [];
    }
  }

  /**
   * Obtiene el detalle completo de una receta de TheMealDB
   */
  static async getMealDBRecipeDetail (mealId) {
    try {
      // Verificar si ya está en caché en Neon
      const cached = await CacheService.getByExternalId('themealdb', mealId);
      if (cached) return cached;

      const baseUrl = process.env.THEMEALDB_API_URL || 'https://www.themealdb.com/api/json/v1/1';
      const url = `${baseUrl}/lookup.php?i=${mealId}`;
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) return null;

      const data = await response.json();
      if (!data || !Array.isArray(data.meals) || data.meals.length === 0) return null;

      const m = data.meals[0];
      const ingredientes = [];

      for (let i = 1; i <= 20; i++) {
        const ing = m[`strIngredient${i}`];
        const measure = m[`strMeasure${i}`];
        if (ing && ing.trim()) {
          ingredientes.push({
            nombre: this.translateToSpanish(ing.trim()),
            cantidad: measure && measure.trim() ? measure.trim() : 'Al gusto'
          });
        }
      }

      // Dividir y traducir instrucciones en pasos ordenados en español
      const rawPasos = (m.strInstructions || '')
        .split(/\r?\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 10);

      const pasos = rawPasos.length > 0
        ? rawPasos.map(p => this.translateStepToSpanish(p))
        : ['Sigue las instrucciones del plato tradicional incorporando los ingredientes paso a paso.'];

      const mapped = {
        receta_id_externo: String(m.idMeal),
        origen: 'themealdb',
        nombre: m.strMeal,
        imagen: m.strMealThumb,
        tiempo: '30 min',
        porciones: '3-4 porciones',
        dificultad: 'Media',
        categoria: m.strCategory || 'Internacional',
        area: m.strArea || 'Internacional',
        texto_ahorro: `Aprovecha ingredientes en una receta internacional estilo ${m.strArea || 'gourmet'}.`,
        ingredientes,
        pasos: pasos.length > 0 ? pasos : ['Sigue las instrucciones del plato tradicional incorporando los ingredientes paso a paso.']
      };

      // Guardar en caché temporal de 24 horas en Neon
      await CacheService.saveMultiple([mapped]);

      return mapped;
    } catch (err) {
      console.warn(`Error al consultar detalle en TheMealDB (${mealId}):`, err.message);
      return null;
    }
  }

  /**
   * Busca recetas en TheMealDB por nombre o término gastronómico (API oficial sin web scraping)
   */
  static async searchFromMealDBByName (searchQuery) {
    if (!searchQuery) return [];
    try {
      const baseUrl = process.env.THEMEALDB_API_URL || 'https://www.themealdb.com/api/json/v1/1';
      const clean = searchQuery.toLowerCase().trim();

      // Construir variantes de búsqueda en inglés para TheMealDB
      const queryTerms = new Set();
      queryTerms.add(clean);

      // Si busca teriyaki / pollo teriyaki
      if (clean.includes('teriyaki')) {
        queryTerms.add('teriyaki');
        queryTerms.add('chicken');
      }

      // Reemplazar palabras en español por sus equivalentes culinarios en inglés
      let translatedTerm = clean;
      for (const [es, en] of Object.entries(INGREDIENT_TRANSLATIONS)) {
        if (translatedTerm.includes(es)) {
          translatedTerm = translatedTerm.replace(new RegExp(es, 'g'), en);
        }
      }
      queryTerms.add(translatedTerm);

      // Palabras clave individuales
      const tokens = clean.split(/\s+/);
      for (const t of tokens) {
        if (t.length >= 3) {
          const en = this.translateToEnglish(t);
          if (en) queryTerms.add(en);
          queryTerms.add(t);
        }
      }

      const results = [];
      const seenMealIds = new Set();

      for (const term of Array.from(queryTerms).slice(0, 4)) {
        const url = `${baseUrl}/search.php?s=${encodeURIComponent(term)}`;
        const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!resp.ok) continue;

        const data = await resp.json();
        if (!data || !Array.isArray(data.meals)) continue;

        for (const m of data.meals) {
          if (seenMealIds.has(m.idMeal)) continue;
          seenMealIds.add(m.idMeal);

          // Ingredientes traducidos al español
          const ingredientes = [];
          for (let i = 1; i <= 20; i++) {
            const ing = m[`strIngredient${i}`];
            const measure = m[`strMeasure${i}`];
            if (ing && ing.trim()) {
              ingredientes.push({
                nombre: this.translateToSpanish(ing.trim()),
                cantidad: measure && measure.trim() ? measure.trim() : 'Al gusto'
              });
            }
          }

          // Pasos de preparación traducidos al español
          const rawPasos = (m.strInstructions || '')
            .split(/\r?\n+/)
            .map(p => p.trim())
            .filter(p => p.length > 10);

          const pasos = rawPasos.length > 0
            ? rawPasos.map(p => this.translateStepToSpanish(p))
            : ['Sigue las instrucciones del plato tradicional incorporando los ingredientes paso a paso.'];

          // Nombre legible en español
          let nombreEs = m.strMeal;
          if (nombreEs.toLowerCase().includes('teriyaki chicken') || nombreEs.toLowerCase().includes('chicken teriyaki')) {
            nombreEs = 'Pollo Teriyaki con Vegetales';
          } else if (nombreEs.toLowerCase().includes('teriyaki salmon')) {
            nombreEs = 'Salmón Glaseado con Teriyaki';
          } else {
            nombreEs = nombreEs
              .replace(/Chicken/gi, 'Pollo')
              .replace(/Teriyaki/gi, 'Teriyaki')
              .replace(/Beef/gi, 'Carne de res')
              .replace(/Fish/gi, 'Pescado')
              .replace(/Salad/gi, 'Ensalada')
              .replace(/Soup/gi, 'Sopa')
              .replace(/Casserole/gi, 'Cazuela')
              .replace(/Curry/gi, 'Curry');
          }

          const mapped = {
            receta_id_externo: String(m.idMeal),
            origen: 'themealdb',
            nombre: nombreEs,
            imagen: m.strMealThumb,
            tiempo: '30 min',
            porciones: '3-4 porciones',
            dificultad: 'Media',
            categoria: m.strCategory || 'Internacional',
            area: m.strArea || 'Internacional',
            texto_ahorro: `Receta internacional (${m.strArea || 'Japonesa'}) conectada con TheMealDB.`,
            ingredientes,
            pasos
          };

          results.push(mapped);
        }
      }

      // Guardar resultados en caché temporal de 24 horas en Neon (respetando términos oficiales)
      if (results.length > 0) {
        await CacheService.saveMultiple(results);
      }

      return results;
    } catch (err) {
      console.warn('Error al buscar en TheMealDB:', err.message);
      return [];
    }
  }

  /**
   * Obtiene recetas peruanas e internacionales relevantes para los ingredientes provistos
   */
  static async getCandidateRecipes (alimentosDisponibles = []) {
    const candidates = [];

    // 1. Siempre incluir el catálogo de recetas peruanas auténticas
    candidates.push(...PERUVIAN_RECIPES);

    // 2. Extraer los 3 ingredientes más prioritarios o urgentes del usuario
    const topIngredients = alimentosDisponibles.slice(0, 3);

    for (const food of topIngredients) {
      const enName = this.translateToEnglish(food.nombre);
      if (enName) {
        const meals = await this.fetchFromMealDBByIngredient(enName);
        for (const m of meals) {
          // Consultar detalle completo (usando caché temporal de 24h)
          const detail = await this.getMealDBRecipeDetail(m.idMeal);
          if (detail && !candidates.some(c => c.receta_id_externo === detail.receta_id_externo)) {
            candidates.push(detail);
          }
        }
      }
    }

    return candidates;
  }
}

module.exports = RecipeApiService;

