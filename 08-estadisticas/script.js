/* =============================================
   ZeroWaste – Estadísticas | script.js
   Gráficos reales, historial de consumo y reportes
   PDF / Excel conectados al backend.
   ============================================= */
'use strict';

(function () {

  const CATEGORY_LABELS = {
    frutas: 'Frutas y verduras',
    lacteos: 'Lácteos',
    cereales: 'Cereales',
    carnes: 'Carnes',
    bebidas: 'Bebidas',
    otros: 'Otros'
  };

  const CATEGORY_COLORS = {
    frutas: '#2F9E5B',
    lacteos: '#6B48A3',
    cereales: '#D3B38D',
    carnes: '#C0392B',
    bebidas: '#F5A524',
    otros: '#55665B'
  };

  const MOTIVO_INFO = {
    consumido: { label: 'Consumido', cls: 'consumido' },
    cocinado: { label: 'Usado en receta', cls: 'cocinado' },
    eliminado: { label: 'Eliminado', cls: 'eliminado' }
  };

  const PERIOD_TITLES = {
    semana: 'Consumo de los últimos 7 días',
    mes: 'Consumo por semana (últimas 6 semanas)',
    anio: 'Consumo por mes (últimos 6 meses)'
  };

  let statsNeon = null;
  let currentPeriod = 'mes';
  let historyTab = 'consumos';
  let historyFilter = 'todos';
  let historyLimit = 15;
  let historyOffsetConsumos = 0;
  let historyOffsetCocinados = 0;
  let historyConsumos = [];
  let historyCocinados = [];
  let historyPagination = { hay_mas_consumos: false, hay_mas_cocinados: false };
  let historyResumen = { consumidos: 0, eliminados: 0, usados_receta: 0, registros: 0 };
  let historyTotals = { consumos: 0, cocinados: 0 };
  let historyLoading = false;

  /* ---------- Utilidades ---------- */
  function escapeHtml (value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate (value) {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value).replace('T', ' ');
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  function formatNumber (value) {
    const n = Number(value) || 0;
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  function showToast (message, isError) {
    let toast = document.getElementById('zwStatsToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'zwStatsToast';
      toast.className = 'zw-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle('error', !!isError);
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.classList.remove('show'); }, 3400);
  }

  /* ---------- Usuario / sidebar ---------- */
  function refreshUser () {
    const user = ZWStore.getUser();
    const firstName = (user.name || 'Usuario').split(' ')[0];
    document.querySelectorAll('#sbUserName, .sp-name').forEach(function (el) { el.textContent = user.name || 'Usuario'; });
    document.querySelectorAll('#sbUserEmail, .sp-email').forEach(function (el) { if (user.email) el.textContent = user.email; });
    document.querySelectorAll('#sbAvatar, .sp-avatar').forEach(function (el) { el.textContent = (user.name || 'U').charAt(0).toUpperCase(); });

    const motivTitle = document.getElementById('motivTitle');
    if (motivTitle) motivTitle.textContent = '¡Vas muy bien, ' + firstName + '!';
  }
  refreshUser();

  /* ---------- Carga de estadísticas ---------- */
  async function cargarEstadisticas () {
    try {
      const res = await ZWStore.apiFetch('/estadisticas');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      statsNeon = json.data;
      updateCards(currentPeriod);
      mostrarIndicadorNeon();
    } catch (err) {
      console.warn('⚠️ Usando datos locales para estadísticas:', err.message);
      updateCards(currentPeriod);
    }
  }

  function mostrarIndicadorNeon () {
    const extraEl = document.getElementById('statsExtraInfo');
    if (!extraEl || !statsNeon) return;
    const badge = statsNeon.logros && statsNeon.logros.heroe_verde
      ? '🏆 ¡Héroe Verde desbloqueado!'
      : '💪 Sigue consumiendo y cocinando para ganar más logros';
    extraEl.textContent =
      '📡 Neon en tiempo real · ' + statsNeon.total_en_inventario + ' alimentos en despensa · ' +
      statsNeon.total_consumidos + ' consumos registrados · S/ ' +
      Number(statsNeon.dinero_ahorrado_pen || 0).toFixed(2) + ' ahorrados · ' + badge;
  }

  /* ---------- Series por período ---------- */
  function getSeries (period) {
    if (!statsNeon) {
      return { labels: [], consumed: [], cooked: [] };
    }

    let consumed = [];
    let cooked = [];
    let labels = [];

    if (period === 'semana') {
      const daily = statsNeon.consumo_diario || [];
      const cookedDaily = statsNeon.recetas_diario || [];
      labels = daily.map(function (item) { return item.label; });
      consumed = daily.map(function (item) { return Number(item.cantidad) || 0; });
      cooked = daily.map(function (_, index) {
        const item = cookedDaily[index];
        return item ? Number(item.cantidad) || 0 : 0;
      });
    } else if (period === 'anio') {
      const monthly = statsNeon.consumo_mensual || [];
      const cookedMonthly = statsNeon.recetas_mensual || [];
      labels = monthly.map(function (item) { return item.label; });
      consumed = monthly.map(function (item) { return Number(item.cantidad) || 0; });
      cooked = monthly.map(function (_, index) {
        const item = cookedMonthly[index];
        return item ? Number(item.cantidad) || 0 : 0;
      });
    } else {
      const weekly = statsNeon.consumo_semanal || [];
      const cookedWeekly = statsNeon.recetas_semanal || [];
      labels = weekly.map(function (item) { return item.label; });
      consumed = weekly.map(function (item) { return Number(item.cantidad) || 0; });
      cooked = weekly.map(function (_, index) {
        const item = cookedWeekly[index];
        return item ? Number(item.cantidad) || 0 : 0;
      });
    }

    return { labels: labels, consumed: consumed, cooked: cooked };
  }

  function sumArray (values) {
    return (values || []).reduce(function (sum, value) { return sum + (Number(value) || 0); }, 0);
  }

  /* ---------- Datos para las tarjetas ---------- */
  function getPeriodData () {
    const local = ZWStore.getStats();
    const base = statsNeon ? {
      savings: Number(statsNeon.dinero_ahorrado_pen) || 0,
      kgSaved: Number(statsNeon.kg_desperdicio_evitado) || 0,
      itemsSaved: Number(statsNeon.alimentos_salvados_total) || 0,
      cooked: Number(statsNeon.recetas_cocinadas) || 0,
      total: Number(statsNeon.total_en_inventario) || 0,
      totalConsumidos: Number(statsNeon.total_consumidos) || 0,
      totalEliminados: Number(statsNeon.total_eliminados) || 0
    } : {
      savings: Number(local.savings) || 0,
      kgSaved: Number(local.kgSaved) || 0,
      itemsSaved: Number(local.itemsSaved) || 0,
      cooked: Number(local.cooked) || 0,
      total: Number(local.total) || 0,
      totalConsumidos: Number(local.cooked) || 0,
      totalEliminados: 0
    };

    const series = getSeries(currentPeriod);
    const consumedPeriod = sumArray(series.consumed);
    const cookedPeriod = sumArray(series.cooked);

    let factor = 1;
    if (currentPeriod === 'semana') factor = 0.22;
    if (currentPeriod === 'anio') factor = 9.5;

    const savings = factor === 1 ? base.savings : base.savings * factor;
    const kgSaved = factor === 1 ? base.kgSaved : base.kgSaved * factor;
    const itemsSaved = factor === 1 ? base.itemsSaved : base.itemsSaved * factor;

    return {
      savings: Number(savings.toFixed(2)),
      kgSaved: Number(kgSaved.toFixed(1)),
      itemsSaved: Math.round(itemsSaved),
      consumedTotal: base.totalConsumidos,
      eliminatedTotal: base.totalEliminados,
      consumedPeriod: consumedPeriod,
      cookedPeriod: cookedPeriod,
      extra: consumedPeriod + ' consumo(s) y ' + cookedPeriod + ' receta(s) en el período',
      series: series
    };
  }

  /* ---------- Animación de valores ---------- */
  function animateVal (el, target, formatter) {
    if (!el) return;
    const end = Number(target) || 0;
    const duration = 650;
    const start = performance.now();
    function tick (now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatter(end * ease);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Actualización general ---------- */
  function updateCards (period) {
    currentPeriod = period;
    const data = getPeriodData();

    animateVal(document.getElementById('valAhorro'), data.savings, function (v) { return 'S/ ' + v.toFixed(2); });
    animateVal(document.getElementById('valDesper'), data.kgSaved, function (v) { return v.toFixed(1) + ' kg'; });
    animateVal(document.getElementById('valAlim'), data.itemsSaved, function (v) { return Math.floor(v).toString(); });
    animateVal(document.getElementById('valConsumidos'), data.consumedTotal, function (v) { return Math.floor(v).toString(); });

    const chartTitle = document.getElementById('chartTitle');
    if (chartTitle) chartTitle.textContent = PERIOD_TITLES[period] || 'Consumo';

    const motivSub = document.getElementById('motivSub');
    if (motivSub) {
      if (statsNeon) {
        if (period === 'semana') {
          motivSub.textContent = 'Esta semana registraste ' + data.consumedPeriod +
            ' consumo(s) y ' + data.cookedPeriod + ' receta(s) cocinada(s). ¡Cada alimento cuenta!';
        } else if (period === 'anio') {
          motivSub.textContent = 'Proyección basada en tu actividad: ' + data.extra +
            '. Sigues construyendo un hábito sostenible.';
        } else {
          motivSub.textContent = 'Este mes evitaste ' + data.kgSaved.toFixed(1) +
            ' kg de desperdicio y registraste ' + data.consumedPeriod +
            ' consumo(s) de alimentos.';
        }
      } else {
        motivSub.textContent = data.extra;
      }
    }

    const extraEl = document.getElementById('statsExtraInfo');
    if (extraEl) {
      extraEl.textContent = statsNeon
        ? '📡 Neon en tiempo real · ' + data.extra + ' · ' + data.eliminatedTotal + ' alimento(s) eliminado(s)'
        : '📦 ' + data.extra;
    }

    const desiredSeries = getSeries(period);
    renderChart(desiredSeries);
    if (statsNeon) {
      renderCategories(statsNeon.categorias_inventario || []);
      renderTopConsumed(statsNeon.top_consumidos || []);
    }
    updateBadges();
  }

  /* ---------- Gráfico SVG agrupado ---------- */
  function renderChart (series) {
    const wrap = document.getElementById('chartSvgWrap');
    if (!wrap) return;

    const labels = series.labels || [];
    const consumed = series.consumed || [];
    const cooked = series.cooked || [];
    const total = sumArray(consumed) + sumArray(cooked);

    if (labels.length === 0 || total === 0) {
      wrap.innerHTML =
        '<div class="chart-empty">' +
          '<div class="empty-chart-icon">📊</div>' +
          '<strong>Aún no hay consumos en este período</strong>' +
          '<span>Cuando uses o cocines alimentos, verás tu progreso aquí.</span>' +
        '</div>';
      return;
    }

    const width = 660;
    const height = 280;
    const margin = { top: 22, right: 14, bottom: 36, left: 42 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const baseline = margin.top + plotH;

    const maxValue = Math.max.apply(null, consumed.concat(cooked).concat([1]));
    const step = niceStep(maxValue / 4);
    const yMax = Math.max(step * 4, 4);

    const groupW = plotW / labels.length;
    const barW = Math.min(20, groupW * 0.27);
    const gap = Math.max(3, groupW * 0.05);

    let svg = '<svg class="zw-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Gráfico de consumo">';
    svg += '<defs>' +
      '<linearGradient id="barConsumed" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#5DD98A"/><stop offset="100%" stop-color="#1E7A46"/>' +
      '</linearGradient>' +
      '<linearGradient id="barCooked" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#FFD166"/><stop offset="100%" stop-color="#E09B14"/>' +
      '</linearGradient>' +
    '</defs>';

    // Líneas guía y etiquetas del eje Y
    for (let i = 0; i <= 4; i++) {
      const value = step * i;
      const y = baseline - (value / yMax) * plotH;
      svg += '<line class="chart-grid-line" x1="' + margin.left + '" y1="' + y.toFixed(1) +
        '" x2="' + (width - margin.right) + '" y2="' + y.toFixed(1) + '"/>';
      svg += '<text class="chart-axis-label" x="' + (margin.left - 8) + '" y="' + (y + 3).toFixed(1) +
        '" text-anchor="end">' + formatNumber(value) + '</text>';
    }

    labels.forEach(function (label, index) {
      const groupX = margin.left + groupW * index;
      const centerX = groupX + groupW / 2;
      const consumedValue = Number(consumed[index]) || 0;
      const cookedValue = Number(cooked[index]) || 0;

      const consumedH = (consumedValue / yMax) * plotH;
      const cookedH = (cookedValue / yMax) * plotH;

      const consumedX = centerX - barW - gap / 2;
      const cookedX = centerX + gap / 2;

      if (consumedValue > 0) {
        svg += '<rect class="chart-bar consumed" x="' + consumedX.toFixed(1) + '" y="' + (baseline - consumedH).toFixed(1) +
          '" width="' + barW.toFixed(1) + '" height="' + consumedH.toFixed(1) + '" rx="4" fill="url(#barConsumed)"' +
          ' style="animation-delay:' + (index * 55) + 'ms">' +
          '<title>' + escapeHtml(label + ': ' + consumedValue + ' consumido(s)') + '</title></rect>';
        svg += '<text class="chart-value-label" x="' + (consumedX + barW / 2).toFixed(1) + '" y="' +
          (baseline - consumedH - 6).toFixed(1) + '" text-anchor="middle">' + formatNumber(consumedValue) + '</text>';
      }

      if (cookedValue > 0) {
        svg += '<rect class="chart-bar cooked" x="' + cookedX.toFixed(1) + '" y="' + (baseline - cookedH).toFixed(1) +
          '" width="' + barW.toFixed(1) + '" height="' + cookedH.toFixed(1) + '" rx="4" fill="url(#barCooked)"' +
          ' style="animation-delay:' + (index * 55 + 90) + 'ms">' +
          '<title>' + escapeHtml(label + ': ' + cookedValue + ' receta(s)') + '</title></rect>';
        svg += '<text class="chart-value-label cooked" x="' + (cookedX + barW / 2).toFixed(1) + '" y="' +
          (baseline - cookedH - 6).toFixed(1) + '" text-anchor="middle">' + formatNumber(cookedValue) + '</text>';
      }

      svg += '<text class="chart-x-label" x="' + centerX.toFixed(1) + '" y="' + (height - 12) +
        '" text-anchor="middle">' + escapeHtml(label) + '</text>';
    });

    svg += '<line class="chart-axis-line" x1="' + margin.left + '" y1="' + baseline +
      '" x2="' + (width - margin.right) + '" y2="' + baseline + '"/>';
    svg += '</svg>';

    wrap.innerHTML = svg;
  }

  function niceStep (raw) {
    if (!isFinite(raw) || raw <= 0) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const normalized = raw / magnitude;
    let step = 1;
    if (normalized <= 1) step = 1;
    else if (normalized <= 2) step = 2;
    else if (normalized <= 5) step = 5;
    else step = 10;
    return step * magnitude;
  }

  /* ---------- Dona de categorías ---------- */
  function renderCategories (categories) {
    const donut = document.getElementById('categoryDonut');
    const legend = document.getElementById('categoryLegend');
    const totalEl = document.getElementById('donutTotal');
    if (!donut || !legend) return;

    const items = (categories || [])
      .map(function (item) {
        return {
          categoria: item.categoria || 'otros',
          cantidad: Number(item.cantidad) || 0,
          color: CATEGORY_COLORS[item.categoria] || CATEGORY_COLORS.otros
        };
      })
      .filter(function (item) { return item.cantidad > 0; });

    const total = items.reduce(function (sum, item) { return sum + item.cantidad; }, 0);
    if (totalEl) totalEl.textContent = total;

    if (total === 0) {
      donut.style.background = 'conic-gradient(#E6EBE7 0deg 360deg)';
      legend.innerHTML = '<div class="chart-empty small"><strong>Despensa vacía</strong><span>Agrega alimentos para ver su composición.</span></div>';
      return;
    }

    let angle = 0;
    const segments = [];
    let legendHtml = '';

    items.forEach(function (item) {
      const percentage = (item.cantidad / total) * 100;
      const start = angle;
      const end = angle + (item.cantidad / total) * 360;
      segments.push(item.color + ' ' + start.toFixed(2) + 'deg ' + end.toFixed(2) + 'deg');
      angle = end;

      legendHtml +=
        '<div class="legend-row">' +
          '<span class="legend-color" style="background:' + item.color + '"></span>' +
          '<span class="legend-name">' + escapeHtml(CATEGORY_LABELS[item.categoria] || item.categoria) + '</span>' +
          '<span class="legend-value">' + item.cantidad + ' · ' + Math.round(percentage) + '%</span>' +
        '</div>';
    });

    donut.style.background = 'conic-gradient(' + segments.join(', ') + ')';
    legend.innerHTML = legendHtml;
  }

  /* ---------- Top de alimentos consumidos ---------- */
  function renderTopConsumed (top) {
    const container = document.getElementById('topConsumedList');
    if (!container) return;

    if (!top || top.length === 0) {
      container.innerHTML = '<div class="chart-empty small"><div class="empty-chart-icon">🥗</div><strong>Aún no hay consumos</strong><span>Usa alimentos desde tu despensa para empezar.</span></div>';
      return;
    }

    const max = Math.max.apply(null, top.map(function (item) { return Number(item.cantidad) || 0; }).concat([1]));
    let html = '';
    top.forEach(function (item, index) {
      const cantidad = Number(item.cantidad) || 0;
      const width = Math.max(4, (cantidad / max) * 100);
      html +=
        '<div class="top-row">' +
          '<span class="top-rank">' + (index + 1) + '</span>' +
          '<div class="top-main">' +
            '<div class="top-head"><span class="top-name">' + escapeHtml(item.nombre) + '</span>' +
            '<span class="top-count">' + cantidad + '</span></div>' +
            '<div class="top-bar-track"><div class="top-bar-fill" style="width:' + width + '%"></div></div>' +
          '</div>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  /* ---------- Logros ---------- */
  function updateBadges () {
    const s = statsNeon ? {
      itemsSaved: statsNeon.alimentos_salvados_total,
      cooked: statsNeon.recetas_cocinadas,
      savings: statsNeon.dinero_ahorrado_pen,
      total: statsNeon.total_en_inventario,
      logros: statsNeon.logros
    } : {
      itemsSaved: ZWStore.getStats().itemsSaved,
      cooked: ZWStore.getStats().cooked,
      savings: ZWStore.getStats().savings,
      total: ZWStore.getStats().total,
      logros: ZWStore.getStats().logros
    };

    const badgePrincipiante = document.getElementById('badgePrincipiante');
    const descPrincipiante  = document.getElementById('badgeDescPrincipiante');
    if (badgePrincipiante) {
      const ok = s.itemsSaved >= 1;
      badgePrincipiante.className = 'badge-item ' + (ok ? 'unlocked' : 'locked');
      if (descPrincipiante) descPrincipiante.textContent = s.itemsSaved + ' alimento(s) salvado(s)';
    }

    const badgeChef = document.getElementById('badgeChef');
    const descChef  = document.getElementById('badgeDescChef');
    if (badgeChef) {
      const ok = s.cooked >= 1;
      badgeChef.className = 'badge-item ' + (ok ? 'unlocked' : 'locked');
      if (descChef) descChef.textContent = s.cooked > 0
        ? s.cooked + ' receta(s) cocinada(s) ✓'
        : 'Cocina tu primera receta sugerida';
    }

    const badgeHeroe = document.getElementById('badgeHeroe');
    if (badgeHeroe) {
      const ok = s.savings >= 50;
      badgeHeroe.className = 'badge-item ' + (ok ? 'unlocked' : 'locked');
    }

    const badgeDespensa = document.getElementById('badgeDespensa');
    if (badgeDespensa) {
      const ok = s.total >= 10 || (s.logros && s.logros.despensa_activa);
      badgeDespensa.className = 'badge-item ' + (ok ? 'unlocked' : 'locked');
      const desc = document.getElementById('badgeDescDespensa');
      if (desc) desc.textContent = (s.total || 0) + ' alimentos en Neon';
    }
  }

  /* ---------- Historial ---------- */
  async function cargarHistorial (reset) {
    if (historyLoading) return;
    historyLoading = true;

    if (reset) {
      historyOffsetConsumos = 0;
      historyOffsetCocinados = 0;
      historyConsumos = [];
      historyCocinados = [];
      const list = document.getElementById('historyList');
      if (list) list.innerHTML = '<div class="chart-empty">Cargando historial...</div>';
    }

    try {
      const data = await ZWStore.getHistorial({
        limite: historyLimit,
        offsetConsumos: reset ? 0 : historyOffsetConsumos,
        offsetCocinados: reset ? 0 : historyOffsetCocinados
      });

      if (!data) throw new Error('Respuesta vacía');

      if (reset) {
        historyConsumos = data.consumos || [];
        historyCocinados = data.cocinados || [];
      } else {
        historyConsumos = historyConsumos.concat(data.consumos || []);
        historyCocinados = historyCocinados.concat(data.cocinados || []);
      }
      historyOffsetConsumos = historyConsumos.length;
      historyOffsetCocinados = historyCocinados.length;

      historyPagination = data.paginacion || { hay_mas_consumos: false, hay_mas_cocinados: false };
      historyResumen = data.resumen || historyResumen;
      historyTotals = {
        consumos: data.total_consumos || historyConsumos.length,
        cocinados: data.total_cocinados || historyCocinados.length
      };

      const sub = document.getElementById('historySub');
      if (sub) {
        sub.textContent = historyTotals.consumos + ' movimiento(s) de alimentos · ' +
          historyTotals.cocinados + ' receta(s) cocinada(s) · ' +
          historyResumen.eliminados + ' eliminado(s).';
      }

      renderHistory();
    } catch (err) {
      console.warn('No se pudo cargar el historial:', err.message);
      const list = document.getElementById('historyList');
      if (list) {
        list.innerHTML = '<div class="chart-empty small"><strong>No se pudo cargar el historial</strong><span>' +
          escapeHtml(err.message) + '</span></div>';
      }
    } finally {
      historyLoading = false;
    }
  }

  function renderHistory () {
    const list = document.getElementById('historyList');
    const footer = document.getElementById('historyFooter');
    if (!list) return;

    if (historyTab === 'cocinados') {
      if (historyCocinados.length === 0) {
        list.innerHTML = '<div class="chart-empty small"><div class="empty-chart-icon">🍳</div><strong>Aún no has cocinado recetas</strong><span>Cuando marques una receta como cocinada aparecerá aquí.</span></div>';
      } else {
        list.innerHTML = historyCocinados.map(function (item) {
          const color = item.color || '#1E7A46';
          const initial = item.inicial || (item.nombre || 'R').charAt(0).toUpperCase();
          return '<div class="history-row">' +
            '<div class="history-avatar" style="background:' + escapeHtml(color) + '">' + escapeHtml(initial) + '</div>' +
            '<div class="history-main">' +
              '<div class="history-name">' + escapeHtml(item.nombre) + '</div>' +
              '<div class="history-meta">' + escapeHtml([item.tiempo, item.porciones].filter(Boolean).join(' · ') || 'Receta preparada') + '</div>' +
            '</div>' +
            '<span class="history-reason cocinado">Receta cocinada</span>' +
            '<span class="history-date">' + escapeHtml(formatDate(item.fecha_cocinado)) + '</span>' +
          '</div>';
        }).join('');
      }

      if (footer) footer.hidden = !historyPagination.hay_mas_cocinados;
      return;
    }

    const filtered = historyConsumos.filter(function (item) {
      return historyFilter === 'todos' || item.motivo === historyFilter;
    });

    if (filtered.length === 0) {
      list.innerHTML = '<div class="chart-empty small"><div class="empty-chart-icon">🥑</div><strong>Sin movimientos para este filtro</strong><span>Prueba con otro filtro o registra el consumo de un alimento.</span></div>';
    } else {
      list.innerHTML = filtered.map(function (item) {
        const info = MOTIVO_INFO[item.motivo] || MOTIVO_INFO.consumido;
        const color = item.color || '#1E7A46';
        const initial = item.inicial || (item.nombre || 'A').charAt(0).toUpperCase();
        const category = CATEGORY_LABELS[item.categoria] || item.categoria || 'Otros';
        const meta = item.cantidad + ' unidad(es) · ' + category +
          (item.notas ? ' · ' + item.notas : '');

        return '<div class="history-row">' +
          '<div class="history-avatar" style="background:' + escapeHtml(color) + '">' + escapeHtml(initial) + '</div>' +
          '<div class="history-main">' +
            '<div class="history-name">' + escapeHtml(item.nombre) + '</div>' +
            '<div class="history-meta">' + escapeHtml(meta) + '</div>' +
          '</div>' +
          '<span class="history-reason ' + info.cls + '">' + info.label + '</span>' +
          '<span class="history-date">' + escapeHtml(formatDate(item.fecha_consumo)) + '</span>' +
        '</div>';
      }).join('');
    }

    if (footer) footer.hidden = !historyPagination.hay_mas_consumos;
  }

  /* ---------- Reportes ---------- */
  async function descargarReporte (tipo, formato, button) {
    const original = button ? button.innerHTML : '';
    if (button) {
      button.disabled = true;
      button.innerHTML = '⏳ Generando...';
    }
    try {
      const filename = await ZWStore.downloadReport(tipo, formato);
      showToast('📄 Reporte descargado: ' + filename, false);
    } catch (err) {
      showToast('⚠️ ' + err.message, true);
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  }

  /* ---------- Pestañas de período ---------- */
  document.querySelectorAll('.pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      document.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('active'); });
      pill.classList.add('active');
      currentPeriod = pill.dataset.val;
      updateCards(currentPeriod);
    });
  });

  /* ---------- Pestañas del historial ---------- */
  document.getElementById('historyTabs')?.addEventListener('click', function (e) {
    const tab = e.target.closest('.history-tab');
    if (!tab) return;
    document.querySelectorAll('.history-tab').forEach(function (item) { item.classList.remove('active'); });
    tab.classList.add('active');
    historyTab = tab.dataset.tab;
    renderHistory();
  });

  document.getElementById('historyFilter')?.addEventListener('change', function (e) {
    historyFilter = e.target.value;
    renderHistory();
  });

  document.getElementById('btnLoadMoreHistory')?.addEventListener('click', function () {
    cargarHistorial(false);
  });

  /* ---------- Botones de exportación ---------- */
  document.getElementById('btnExportPdf')?.addEventListener('click', function () {
    descargarReporte('estadisticas', 'pdf', this);
  });
  document.getElementById('btnExportExcel')?.addEventListener('click', function () {
    descargarReporte('estadisticas', 'excel', this);
  });
  document.getElementById('btnExportHistoryPdf')?.addEventListener('click', function () {
    descargarReporte('historial', 'pdf', this);
  });
  document.getElementById('btnExportHistoryExcel')?.addEventListener('click', function () {
    descargarReporte('historial', 'excel', this);
  });

  /* ---------- Modal de perfil ---------- */
  const profileBtn     = document.getElementById('sidebarProfileBtn');
  const modalOverlay   = document.getElementById('profileModalOverlay');
  const btnCloseModal  = document.getElementById('btnCloseProfileModal');
  const btnCancelModal = document.getElementById('btnCancelProfileModal');
  const editForm       = document.getElementById('profileEditForm');
  const editName       = document.getElementById('editUserName');
  const editEmail      = document.getElementById('editUserEmail');

  function openProfileModal () {
    const u = ZWStore.getUser();
    if (editName)  editName.value  = u.name  || '';
    if (editEmail) editEmail.value = u.email || '';
    if (modalOverlay) modalOverlay.classList.add('open');
  }
  function closeProfileModal () {
    if (modalOverlay) modalOverlay.classList.remove('open');
  }

  if (profileBtn)      profileBtn.addEventListener('click', openProfileModal);
  if (btnCloseModal)   btnCloseModal.addEventListener('click', closeProfileModal);
  if (btnCancelModal)  btnCancelModal.addEventListener('click', closeProfileModal);
  if (modalOverlay)    modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) closeProfileModal(); });

  if (editForm) {
    editForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const n  = editName?.value.trim()  || 'Usuario';
      const em = editEmail?.value.trim() || '';
      ZWStore.saveUser({ name: n, email: em });
      refreshUser();
      updateCards(currentPeriod);
      closeProfileModal();
    });
  }

  /* ---------- Inicialización ---------- */
  updateCards(currentPeriod);

  cargarEstadisticas();
  cargarHistorial(true);

  window.addEventListener('zw:synced', function () {
    cargarEstadisticas();
  });

})();
