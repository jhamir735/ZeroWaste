/* =============================================
   ZeroWaste – Estadísticas | script.js
   Conectado con PostgreSQL Neon vía backend API
   Muestra datos reales: alimentos, recetas cocinadas,
   ahorro estimado, desperdicio evitado y logros
   ============================================= */
'use strict';

(function () {

  const API_BASE = '/api';

  /* ---- Usuario y Sidebar ---- */
  function refreshUser () {
    const user = ZWStore.getUser();
    const firstName = (user.name || 'María').split(' ')[0];
    document.querySelectorAll('#sbUserName, .sp-name').forEach(el => el.textContent = user.name);
    document.querySelectorAll('#sbUserEmail, .sp-email').forEach(el => { if (user.email) el.textContent = user.email; });
    document.querySelectorAll('#sbAvatar, .sp-avatar').forEach(el => el.textContent = (user.name || 'M').charAt(0).toUpperCase());
    const motivTitle = document.getElementById('motivTitle');
    if (motivTitle) motivTitle.textContent = '¡Vas muy bien, ' + firstName + '!';
  }
  refreshUser();

  /* ============ CARGA DE DATOS REALES DESDE NEON ============ */
  let statsNeon = null; // Guardamos los stats reales para usarlos en los gráficos

  async function cargarEstadisticas () {
    try {
      const res = await fetch(`${API_BASE}/estadisticas?usuario_id=1`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      statsNeon = json.data;
      console.log('📊 Estadísticas cargadas desde Neon:', statsNeon);
      updateCards(currentPeriod);
      mostrarIndicadorNeon();
    } catch (err) {
      console.warn('⚠️ Usando datos locales para estadísticas:', err.message);
      updateCards(currentPeriod);
    }
  }

  function mostrarIndicadorNeon () {
    const hdr = document.querySelector('.ph-sub');
    if (hdr && statsNeon) {
      hdr.textContent = `📡 Datos en tiempo real de Neon · ${statsNeon.total_en_inventario} alimentos · ${statsNeon.recetas_cocinadas} recetas cocinadas`;
    }
    const extraEl = document.getElementById('statsExtraInfo');
    if (extraEl && statsNeon) {
      const badge = statsNeon.logros.heroe_verde ? '🏆 ¡Héroe Verde desbloqueado!' : '💪 Sigue cocinando para ganar más logros';
      extraEl.textContent = `📡 Neon en tiempo real · S/ ${statsNeon.dinero_ahorrado_pen.toFixed(2)} ahorrados · ${badge}`;
    }
  }

  /* ============ GENERADOR DE DATOS POR PERÍODO ============ */
  function getDataMap () {
    // Usar datos de Neon si están disponibles, si no, del store local
    const s = statsNeon ? {
      savings:     statsNeon.dinero_ahorrado_pen,
      kgSaved:     statsNeon.kg_desperdicio_evitado,
      itemsSaved:  statsNeon.alimentos_salvados_total,
      cooked:      statsNeon.recetas_cocinadas,
      total:       statsNeon.total_en_inventario,
      urgentCount: statsNeon.alimentos_urgentes_hoy,
      logros:      statsNeon.logros
    } : ZWStore.getStats();

    const user = ZWStore.getUser();
    const firstName = (user.name || 'María').split(' ')[0];

    const monthlySavings = s.savings;
    const monthlyKg      = s.kgSaved;
    const monthlyItems   = s.itemsSaved;
    const cooked         = s.cooked || 0;
    const total          = s.total || 0;

    const weeklySavings = Math.max(5.0, Number((monthlySavings * 0.28).toFixed(2)));
    const weeklyKg      = Math.max(0.4, Number((monthlyKg * 0.25).toFixed(1)));
    const weeklyItems   = Math.max(1,   Math.round(monthlyItems * 0.25));

    const annualSavings = Math.max(100, Number((monthlySavings * 9.5).toFixed(2)));
    const annualKg      = Math.max(10,  Number((monthlyKg * 9.5).toFixed(1)));
    const annualItems   = Math.max(10,  Math.round(monthlyItems * 9.5));

    return {
      semana: {
        a: weeklySavings, d: weeklyKg, al: weeklyItems,
        extra: `${cooked} receta(s) cocinada(s) · ${total} alimentos en despensa`,
        chart: [
          { m: 'Lun', v: Number((weeklySavings * 0.12).toFixed(1)) },
          { m: 'Mar', v: Number((weeklySavings * 0.18).toFixed(1)) },
          { m: 'Mié', v: Number((weeklySavings * 0.10).toFixed(1)) },
          { m: 'Jue', v: Number((weeklySavings * 0.22).toFixed(1)) },
          { m: 'Vie', v: Number((weeklySavings * 0.16).toFixed(1)) },
          { m: 'Sáb', v: Number((weeklySavings * 0.22).toFixed(1)), active: true },
        ],
        maxV: Math.max(8, weeklySavings * 0.35),
        chartTitle: 'Ahorro estimado por día esta semana (S/)',
        motivSub: `Esta semana lograste aprovechar ${weeklyItems} alimentos clave. ¡Cada porción cuenta para el planeta!`
      },
      mes: {
        a: monthlySavings, d: monthlyKg, al: monthlyItems,
        extra: `${cooked} receta(s) cocinada(s) · ${total} alimentos en Neon`,
        chart: [
          { m: 'Sem 1', v: Number((monthlySavings * 0.22).toFixed(1)) },
          { m: 'Sem 2', v: Number((monthlySavings * 0.28).toFixed(1)) },
          { m: 'Sem 3', v: Number((monthlySavings * 0.24).toFixed(1)) },
          { m: 'Sem 4', v: Number((monthlySavings * 0.26).toFixed(1)), active: true },
        ],
        maxV: Math.max(15, monthlySavings * 0.35),
        chartTitle: 'Ahorro estimado por semana este mes (S/)',
        motivSub: `¡Felicidades, ${firstName}! Este mes evitaste ${monthlyKg} kg de desperdicio y ahorraste S/ ${monthlySavings.toFixed(2)}.`
      },
      anio: {
        a: annualSavings, d: annualKg, al: annualItems,
        extra: `Proyección anual basada en ${cooked} receta(s) cocinada(s)`,
        chart: [
          { m: 'May', v: Number((annualSavings * 0.08).toFixed(0)) },
          { m: 'Jun', v: Number((annualSavings * 0.10).toFixed(0)) },
          { m: 'Jul', v: Number((annualSavings * 0.12).toFixed(0)) },
          { m: 'Ago', v: Number((annualSavings * 0.14).toFixed(0)) },
          { m: 'Sep', v: Number((annualSavings * 0.15).toFixed(0)) },
          { m: 'Oct', v: Number((annualSavings * 0.18).toFixed(0)) },
          { m: 'Nov', v: Number((annualSavings * 0.23).toFixed(0)), active: true },
        ],
        maxV: Math.max(60, annualSavings * 0.3),
        chartTitle: 'Ahorro mensual proyectado en el año (S/)',
        motivSub: `En el año has rescatado ${annualItems} alimentos y ahorrado más de S/ ${Math.round(annualSavings)}. ¡Eres un héroe ambiental!`
      }
    };
  }

  /* ============ ANIMAR NÚMEROS ============ */
  function animateVal (el, target, fmt) {
    if (!el) return;
    const dur = 650;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * ease);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ============ ACTUALIZAR TARJETAS ============ */
  let currentPeriod = 'mes';

  function updateCards (key) {
    const dataMap = getDataMap();
    const d = dataMap[key];
    if (!d) return;

    animateVal(document.getElementById('valAhorro'), d.a,  v => 'S/ ' + v.toFixed(2));
    animateVal(document.getElementById('valDesper'), d.d,  v => v.toFixed(1) + ' kg');
    animateVal(document.getElementById('valAlim'),   d.al, v => Math.floor(v).toString());

    // Subtítulo motivacional
    const motivSub = document.getElementById('motivSub');
    if (motivSub) motivSub.textContent = d.motivSub;

    // Título del gráfico
    const chartTitle = document.getElementById('chartTitle');
    if (chartTitle) chartTitle.textContent = d.chartTitle;

    // Texto extra con datos reales de Neon
    const extraEl = document.getElementById('statsExtraInfo');
    if (extraEl) {
      extraEl.textContent = statsNeon
        ? '📡 Datos en tiempo real desde Neon · ' + d.extra
        : '📦 ' + d.extra;
    }

    buildChart(d.chart, d.maxV);
    updateBadges();
  }

  /* ============ GRÁFICO DE BARRAS ============ */
  function buildChart (data, maxV) {
    const chartBars = document.getElementById('chartBars');
    if (!chartBars) return;

    let html = '';
    data.forEach(function (d, i) {
      const pct = Math.min(100, Math.max(10, Math.round((d.v / maxV) * 100)));
      html += `<div class="bar-col ${d.active ? 'active' : ''}">`;
      html += `  <div class="bar-val">${d.v > 0 ? d.v : ''}</div>`;
      html += `  <div class="bar-fill" id="bar-${i}" style="height:0%" data-h="${pct}"></div>`;
      html += `  <div class="bar-lbl">${d.m}</div>`;
      html += `</div>`;
    });
    chartBars.innerHTML = html;

    setTimeout(function () {
      data.forEach(function (d, i) {
        const bar = document.getElementById('bar-' + i);
        if (bar) bar.style.height = bar.dataset.h + '%';
      });
    }, 80);
  }

  /* ============ LOGROS DINÁMICOS ============ */
  function updateBadges () {
    const s = statsNeon ? {
      itemsSaved: statsNeon.alimentos_salvados_total,
      cooked:     statsNeon.recetas_cocinadas,
      savings:    statsNeon.dinero_ahorrado_pen,
      logros:     statsNeon.logros
    } : ZWStore.getStats();

    // 1. Principiante
    const badgePrincipiante = document.getElementById('badgePrincipiante');
    const descPrincipiante  = document.getElementById('badgeDescPrincipiante');
    if (badgePrincipiante) {
      const ok = s.itemsSaved >= 1;
      badgePrincipiante.className = 'badge-item ' + (ok ? 'unlocked' : 'locked');
      if (descPrincipiante) descPrincipiante.textContent = s.itemsSaved + ' alimento(s) salvado(s)';
    }

    // 2. Chef creativo
    const badgeChef = document.getElementById('badgeChef');
    const descChef  = document.getElementById('badgeDescChef');
    if (badgeChef) {
      const ok = s.cooked >= 1;
      badgeChef.className = 'badge-item ' + (ok ? 'unlocked' : 'locked');
      if (descChef) descChef.textContent = s.cooked > 0
        ? s.cooked + ' receta(s) cocinada(s) ✓'
        : 'Cocina tu primera receta sugerida';
    }

    // 3. Héroe verde (ahorro >= S/ 50)
    const badgeHeroe = document.getElementById('badgeHeroe');
    if (badgeHeroe) {
      const ok = s.savings >= 50;
      badgeHeroe.className = 'badge-item ' + (ok ? 'unlocked' : 'locked');
    }

    // 4. Logro adicional: Despensa activa (>= 10 alimentos en Neon)
    const badgeDespensa = document.getElementById('badgeDespensa');
    if (badgeDespensa && statsNeon) {
      const ok = statsNeon.total_en_inventario >= 10 || (statsNeon.logros && statsNeon.logros.despensa_activa);
      badgeDespensa.className = 'badge-item ' + (ok ? 'unlocked' : 'locked');
      const desc = document.getElementById('badgeDescDespensa');
      if (desc) desc.textContent = (statsNeon.total_en_inventario || 0) + ' alimentos en Neon';
    }
  }

  /* ============ PESTAÑAS DE PERÍODO ============ */
  document.querySelectorAll('.pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentPeriod = pill.dataset.val;
      updateCards(currentPeriod);
    });
  });

  /* ============ MODAL DE PERFIL ============ */
  const profileBtn    = document.getElementById('sidebarProfileBtn');
  const modalOverlay  = document.getElementById('profileModalOverlay');
  const btnCloseModal = document.getElementById('btnCloseProfileModal');
  const btnCancelModal= document.getElementById('btnCancelProfileModal');
  const editForm      = document.getElementById('profileEditForm');
  const editName      = document.getElementById('editUserName');
  const editEmail     = document.getElementById('editUserEmail');

  function openProfileModal () {
    const u = ZWStore.getUser();
    if (editName)  editName.value  = u.name  || '';
    if (editEmail) editEmail.value = u.email || '';
    if (modalOverlay) modalOverlay.classList.add('open');
  }
  function closeProfileModal () {
    if (modalOverlay) modalOverlay.classList.remove('open');
  }

  if (profileBtn)     profileBtn.addEventListener('click', openProfileModal);
  if (btnCloseModal)  btnCloseModal.addEventListener('click', closeProfileModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeProfileModal);
  if (modalOverlay)   modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeProfileModal(); });

  if (editForm) {
    editForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const n  = editName?.value.trim()  || 'María Pérez';
      const em = editEmail?.value.trim() || 'maria@correo.com';
      ZWStore.saveUser({ name: n, email: em });
      refreshUser();
      updateCards(currentPeriod);
      closeProfileModal();
    });
  }

  /* ============ INICIALIZACIÓN ============ */
  // 1. Mostrar datos locales inmediatamente
  updateCards(currentPeriod);

  // 2. Cargar datos frescos de Neon
  cargarEstadisticas();

  // 3. Re-cargar cuando hay sincronización global
  window.addEventListener('zw:synced', function () {
    cargarEstadisticas();
  });

})();
