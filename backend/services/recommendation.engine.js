/* =============================================
   ZeroWaste – Motor Inteligente de Recomendaciones
   Archivo: backend/services/recommendation.engine.js
   Clasifica y prioriza recetas según despensa y vencimiento
   ============================================= */
'use strict';

// Despensa básica común que casi todo hogar tiene (no obligan a ir a comprar)
const INGREDIENTES_BASICOS = [
  'sal', 'pimienta', 'comino', 'aceite', 'agua', 'oregano',
  'hielo', 'cubos de hielo', 'azucar', 'miel', 'canela',
  'ajo', 'ajos', 'vinagre', 'sillao', 'salsa de soya', 'harina'
];

class RecommendationEngine {
  /**
   * Normaliza una cadena de texto para comparación flexible de ingredientes
   */
  static normalize (text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar tildes
      .replace(/[^a-z0-9\s]/g, ' ') // Quitar caracteres raros
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Determina si un ingrediente de la receta coincide con un alimento de la despensa
   */
  static matchesIngredient (recipeIngName, pantryFoodName) {
    const rNorm = this.normalize(recipeIngName);
    const pNorm = this.normalize(pantryFoodName);

    if (rNorm === pNorm) return true;
    if (rNorm.includes(pNorm) || pNorm.includes(rNorm)) return true;

    // Tokens clave
    const pTokens = pNorm.split(' ').filter(t => t.length > 2);
    const rTokens = rNorm.split(' ').filter(t => t.length > 2);

    for (const pt of pTokens) {
      for (const rt of rTokens) {
        // Singular / Plural simple
        const pSingular = pt.endsWith('s') ? pt.slice(0, -1) : pt;
        const rSingular = rt.endsWith('s') ? rt.slice(0, -1) : rt;
        if (pSingular === rSingular) return true;
      }
    }

    return false;
  }

  /**
   * Evalúa y puntúa una lista de recetas según los alimentos de la despensa del usuario
   */
  static evaluateRecipes (recetas = [], alimentosUsuario = []) {
    // Alimentos vigentes del usuario
    const despensa = alimentosUsuario.map(a => {
      const dias = parseInt(a.dias_restantes, 10);
      return {
        id: a.id,
        nombre: a.nombre,
        categoria: a.categoria,
        cantidad: parseInt(a.cantidad, 10) || 1,
        ubicacion: a.ubicacion,
        dias_restantes: isNaN(dias) ? 99 : dias,
        es_urgente: !isNaN(dias) && dias <= 3
      };
    });

    const evaluated = recetas.map((r, index) => {
      const rIngs = Array.isArray(r.ingredientes) ? r.ingredientes : [];
      const disponibles = [];
      const faltantes = [];

      for (const ing of rIngs) {
        const ingName = typeof ing === 'string' ? ing : (ing.nombre || ing.name || '');
        const ingCant = typeof ing === 'object' ? (ing.cantidad || ing.measure || '') : '';
        
        // Buscar coincidencia en despensa
        const match = despensa.find(p => this.matchesIngredient(ingName, p.nombre));

        if (match) {
          disponibles.push({
            nombre: ingName,
            nombre_despensa: match.nombre,
            cantidad_requerida: ingCant,
            cantidad_disponible: match.cantidad,
            dias_restantes: match.dias_restantes,
            es_urgente: match.es_urgente,
            alimento_id: match.id
          });
        } else {
          // Si es un ingrediente básico (sal, agua, etc.), marcarlo pero no penalizar fuertemente
          const isBasic = INGREDIENTES_BASICOS.some(b => this.normalize(ingName).includes(b));
          faltantes.push({
            nombre: ingName,
            cantidad: ingCant,
            es_basico: isBasic
          });
        }
      }

      const totalIngs = Math.max(1, disponibles.length + faltantes.length);
      const porcentajeDisponible = Math.round((disponibles.length / totalIngs) * 100);
      
      // Contar cuántos alimentos urgentes salva esta receta
      const urgentesSalvados = disponibles.filter(d => d.es_urgente);
      const vencenHoyCount = disponibles.filter(d => d.dias_restantes <= 0).length;

      // Se puede cocinar ya si no le faltan ingredientes esenciales
      const faltantesNoBasicos = faltantes.filter(f => !f.es_basico);
      const puedeCocinarYa = faltantesNoBasicos.length === 0;

      // Puntuación inteligente anti-desperdicio (Scoring)
      let score = 0;
      score += disponibles.length * 15;
      score += urgentesSalvados.length * 40;
      score += vencenHoyCount * 30;
      if (puedeCocinarYa) score += 100; // Gran bonificación para recetas listas para cocinar sin comprar
      score -= faltantesNoBasicos.length * 10;

      // Identificador único consistente
      const idFinal = r.id || r.receta_id_externo || `rec_${index}`;

      return {
        ...r,
        id: idFinal,
        receta_id_externo: r.receta_id_externo || String(idFinal),
        score: Math.max(0, score),
        ingredientes_disponibles: disponibles,
        ingredientes_faltantes: faltantes,
        faltantes_no_basicos_count: faltantesNoBasicos.length,
        porcentaje_disponible: porcentajeDisponible,
        puede_cocinar_ya: puedeCocinarYa,
        aprovecha_urgentes: urgentesSalvados.length > 0,
        salva_urgentes_count: urgentesSalvados.length,
        vencen_hoy_count: vencenHoyCount,
        resumen_ahorro: puedeCocinarYa
          ? (urgentesSalvados.length > 0
              ? `🍳 100% en despensa · Salva ${urgentesSalvados.length} alimento(s) por vencer: ${urgentesSalvados.map(u => u.nombre_despensa).join(', ')}`
              : `🍳 100% en despensa · Lista para cocinar con lo que ya tienes`)
          : (urgentesSalvados.length > 0
              ? `🚨 Salva ${urgentesSalvados.length} alimento(s) por vencer pronto: ${urgentesSalvados.map(u => u.nombre_despensa).join(', ')}`
              : `Aprovecha ${disponibles.length} ingrediente(s) de tu despensa`)
      };
    });

    // 1. Filtrar rigurosamente: DESCARTAR recetas que no tienen NINGÚN ingrediente en la despensa
    const conIngredientes = evaluated.filter(r => r.ingredientes_disponibles.length > 0);

    // 2. Ordenar:
    // a) Primero las 100% listas para cocinar (sin comprar)
    // b) Entre ellas, las que salvan alimentos por vencer
    // c) Luego por mayor score
    // d) Al final, las que requieren comprar más ingredientes
    return conIngredientes.sort((a, b) => {
      if (a.puede_cocinar_ya !== b.puede_cocinar_ya) {
        return a.puede_cocinar_ya ? -1 : 1;
      }
      if (b.salva_urgentes_count !== a.salva_urgentes_count) {
        return b.salva_urgentes_count - a.salva_urgentes_count;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.faltantes_no_basicos_count - b.faltantes_no_basicos_count;
    });
  }
}

module.exports = RecommendationEngine;

