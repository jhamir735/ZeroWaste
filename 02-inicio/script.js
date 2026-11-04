/* =============================================
   ZeroWaste – Inicio | script.js
   Conectado con Neon (PostgreSQL) vía backend API
   Muestra datos en tiempo real: despensa, alertas,
   receta inteligente sugerida según urgencia
   ============================================= */
'use strict';

(function () {

  const API_BASE = '/api';

  /* ============ USUARIO Y SIDEBAR ============ */
  function refreshUser () {
    const user = ZWStore.getUser();
    const firstName = (user.name || 'María').split(' ')[0];
    const hour = new Date().getHours();
    const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

    const greetEl = document.getElementById('headerGreeting');
    if (greetEl) greetEl.textContent = saludo + ', ' + firstName;

    document.querySelectorAll('#sbUserName, .sp-name').forEach(el => el.textContent = user.name);
    document.querySelectorAll('#sbUserEmail, .sp-email').forEach(el => { if (user.email) el.textContent = user.email; });
    document.querySelectorAll('#sbAvatar, .sp-avatar').forEach(el => el.textContent = (user.name || 'M').charAt(0).toUpperCase());
  }

  /* ============ CARGA DE DATOS DESDE NEON ============ */
  async function cargarDashboard () {
    refreshUser();

    // Lanzar peticiones en paralelo para mayor velocidad
    const [statsRes, alimentosRes, recomRes] = await Promise.allSettled([
      fetch(`${API_BASE}/estadisticas?usuario_id=1`).then(r => r.json()),
      fetch(`${API_BASE}/alimentos?usuario_id=1`).then(r => r.json()),
      fetch(`${API_BASE}/recetas/recomendaciones?usuario_id=1&filtro=todas`).then(r => r.json())
    ]);

    // ---- Estadísticas de Neon ----
    const stats = (statsRes.status === 'fulfilled' && statsRes.value.success)
      ? statsRes.value.data
      : null;

    renderMiniStats(stats);

    // ---- Alimentos próximos a vencer de Neon ----
    const alimentos = (alimentosRes.status === 'fulfilled' && alimentosRes.value.success)
      ? alimentosRes.value.data || []
      : ZWStore.getFoodsWithStatus();

    renderAlertBanner(alimentos);
    renderExpiringList(alimentos);

    // ---- Receta sugerida inteligente desde Neon ----
    const recetas = (recomRes.status === 'fulfilled' && recomRes.value.success)
      ? recomRes.value.data || []
      : ZWStore.getRecipes();

    if (recetas.length > 0) ZWStore.saveFoods !== undefined && save_recipes_local(recetas);
    renderRecetaSugerida(recetas);
  }

  /* ---- Guardar recetas en store local para otras páginas ---- */
  function save_recipes_local (recetas) {
    try {
      localStorage.setItem('zw_recipes', JSON.stringify(recetas));
    } catch (e) {}
  }

  /* ============ MINI STATS ============ */
  function renderMiniStats (stats) {
    const statAprovechados = document.getElementById('statAlimAprovechados');
    const statAhorro = document.getElementById('statAhorroMes');
    const statTotal = document.getElementById('statTotalFoods');
    const statRecetas = document.getElementById('statRecetasCocinadas');

    if (stats) {
      if (statAprovechados) animNum(statAprovechados, stats.alimentos_salvados_total);
      if (statAhorro) animMoney(statAhorro, stats.dinero_ahorrado_pen);
      if (statTotal) animNum(statTotal, stats.total_en_inventario);
      if (statRecetas) animNum(statRecetas, stats.recetas_cocinadas);
    } else {
      // Fallback datos locales
      const s = ZWStore.getStats();
      if (statAprovechados) statAprovechados.textContent = s.itemsSaved;
      if (statAhorro) statAhorro.textContent = 'S/ ' + s.savings.toFixed(2);
      if (statTotal) statTotal.textContent = s.total;
      if (statRecetas) statRecetas.textContent = s.cooked;
    }
  }

  function animNum (el, target) {
    const dur = 700;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(target * ease);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function animMoney (el, target) {
    const dur = 700;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = 'S/ ' + (target * ease).toFixed(2);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ============ BANNER DE ALERTA ============ */
  function renderAlertBanner (alimentos) {
    // Calcular urgentes desde datos de Neon
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    const urgent = alimentos.filter(a => {
      const fv = new Date(a.fecha_vencimiento || a.expDate);
      fv.setHours(0,0,0,0);
      const diff = Math.floor((fv - hoy) / 86400000);
      return diff <= 3;
    });

    const alertCard = document.getElementById('alertCard');
    const alertCountCard = document.getElementById('alertCountCard');
    const alertCountHdr = document.getElementById('alertCountHdr');
    const hdrSub = document.getElementById('headerSub');

    if (alertCountCard) alertCountCard.textContent = urgent.length;
    if (alertCountHdr) alertCountHdr.textContent = urgent.length;
    if (hdrSub) {
      hdrSub.innerHTML = urgent.length > 0
        ? `Tienes <strong id="alertCountHdr">${urgent.length}</strong> alimento(s) por vencer pronto`
        : 'Tu despensa está en buen estado 🌱';
    }

    // Actualizar badges de navegación
    document.querySelectorAll('#navBadgeAlertas, .sb-badge').forEach(el => {
      el.textContent = urgent.length;
      el.style.display = urgent.length > 0 ? 'flex' : 'none';
    });
    document.querySelectorAll('#mnBadgeAlertas, .mn-badge').forEach(el => {
      el.style.display = urgent.length > 0 ? 'block' : 'none';
    });

    if (alertCard) {
      if (urgent.length === 0) {
        alertCard.style.background = 'var(--success-bg)';
        alertCard.style.borderLeftColor = 'var(--primary)';
        alertCard.innerHTML =
          '<div class="ac-icon" style="color:var(--primary);">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
          '</div>' +
          '<div class="ac-text"><strong>¡Todo bajo control!</strong> No tienes alimentos por vencer en los próximos 3 días.</div>' +
          '<a href="../03-mis-alimentos/index.html" class="btn-outline-sm">Ver despensa</a>';
      } else {
        alertCard.style.background = '';
        alertCard.style.borderLeftColor = '';
        // Mostrar nombres de los urgentes
        const nombres = urgent.slice(0, 3).map(a => a.nombre || a.name).join(', ');
        const extra = urgent.length > 3 ? ` y ${urgent.length - 3} más` : '';
        alertCard.innerHTML =
          '<div class="ac-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
          '</div>' +
          '<div class="ac-text">' +
            '<strong>¡' + urgent.length + ' alimento(s) por vencer!</strong> ' +
            '<span style="font-size:12.5px;">' + nombres + extra + '</span>' +
          '</div>' +
          '<a href="../05-alertas/index.html" class="btn-outline-sm">Ver alertas</a>';
      }
    }
  }

  /* ============ LISTA DE PRÓXIMOS A VENCER ============ */
  function renderExpiringList (alimentos) {
    const alertList = document.getElementById('expiringList');
    if (!alertList) return;

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    // Ordenar por urgencia
    const conDias = alimentos.map(a => {
      const fv = new Date(a.fecha_vencimiento || a.expDate);
      fv.setHours(0,0,0,0);
      const dias = Math.floor((fv - hoy) / 86400000);
      let badge = { text: `${dias}d`, cls: 'badge-ok' };
      if (dias <= 0) badge = { text: 'Vence hoy', cls: 'badge-urgent' };
      else if (dias <= 3) badge = { text: `${dias} día${dias === 1 ? '' : 's'}`, cls: 'badge-warning' };
      return { ...a, dias, badge };
    }).sort((a, b) => a.dias - b.dias);

    alertList.innerHTML = '';

    if (conDias.length === 0) {
      alertList.innerHTML =
        '<li style="text-align:center;color:var(--text-sec);padding:24px 16px;font-size:13.5px;">' +
          '🎉 ¡Excelente! No tienes alimentos registrados aún. Agrega alimentos para llevar el control.' +
        '</li>';
      return;
    }

    // Mostrar los 4 más urgentes
    const mostrar = conDias.slice(0, 4);

    if (conDias.filter(a => a.dias <= 3).length === 0) {
      alertList.innerHTML =
        '<li style="text-align:center;color:var(--primary);padding:14px 16px;font-size:13.5px;background:var(--success-bg);border-radius:10px;list-style:none;">' +
          '✨ ¡Todo bien! No tienes alimentos por vencer en los próximos 3 días.' +
        '</li>';
      return;
    }

    mostrar.forEach(function (food, i) {
      const li = document.createElement('li');
      li.className = 'food-row';
      li.style.animationDelay = (i * 60) + 'ms';

      const nombre = food.nombre || food.name || 'Alimento';
      const qty = food.cantidad || food.qty || 1;
      const ubicacion = food.ubicacion || food.location || 'despensa';
      const inicial = nombre.charAt(0).toUpperCase();
      const avatarColor = food.color || '#1E7A46';

      let avatarHtml = inicial;
      if (food.imagen || food.image) {
        avatarHtml = `<img src="${food.imagen || food.image}" alt="${nombre}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      }

      li.innerHTML =
        `<div class="food-avatar" style="background:${avatarColor}">${avatarHtml}</div>` +
        `<div class="fr-info">` +
          `<p class="fr-name">${nombre}</p>` +
          `<p class="fr-meta">${qty} unidad(es) • ${ubicacion}</p>` +
        `</div>` +
        `<span class="badge ${food.badge.cls}">${food.badge.text}</span>`;

      alertList.appendChild(li);
    });
  }

  /* ============ RECETA SUGERIDA INTELIGENTE ============ */
  function renderRecetaSugerida (recetas) {
    const sTitle = document.getElementById('suggestedRecipeTitle');
    const sDesc  = document.getElementById('suggestedRecipeDesc');
    const sTime  = document.getElementById('suggestedRecipeTime');
    const sServ  = document.getElementById('suggestedRecipeServings');
    const sBtn   = document.getElementById('btnVerRecetaSugerida');
    const sTag   = document.getElementById('suggestedRecipeTag');
    const sVisual = document.getElementById('suggestedRecipeVisual');

    if (!recetas || recetas.length === 0) return;

    // Prioridad estricta: 100% en despensa (sin comprar ingredientes) que además salve alimentos urgentes
    let suggested = recetas.find(r => r.puede_cocinar_ya && r.aprovecha_urgentes)
      || recetas.find(r => r.puede_cocinar_ya)
      || recetas[0];

    if (!suggested) return;

    const nombre = suggested.nombre || suggested.name || 'Receta del día';
    const desc = suggested.resumen_ahorro || suggested.texto_ahorro || suggested.savesText || 'Aprovecha ingredientes de tu despensa.';
    const tiempo = suggested.tiempo || suggested.time || '25 min';
    const porciones = suggested.porciones || suggested.servings || '2 porciones';
    const targetId = suggested.receta_id_externo || String(suggested.id || '1');

    if (sTitle) sTitle.textContent = nombre;
    if (sDesc)  sDesc.textContent  = desc;
    if (sTime)  sTime.textContent  = '⏱️ ' + tiempo;
    if (sServ)  sServ.textContent  = '👥 ' + porciones;
    if (sBtn)   sBtn.href = '../07-detalle-receta/index.html?id=' + encodeURIComponent(targetId);

    // Tag dinámico según urgencia
    if (sTag) {
      if (suggested.aprovecha_urgentes) {
        sTag.textContent = '🚨 Salva ' + (suggested.salva_urgentes_count || '') + ' por vencer';
        sTag.style.background = 'var(--urgent-bg)';
        sTag.style.color = 'var(--urgent-text)';
      } else if (suggested.puede_cocinar_ya) {
        sTag.textContent = '🍳 100% en tu despensa';
        sTag.style.background = 'var(--success-bg)';
        sTag.style.color = 'var(--primary)';
      } else if (suggested.es_ia) {
        sTag.textContent = '✨ Receta del Chef IA';
      } else {
        sTag.textContent = suggested.area === 'Peruana' ? '🇵🇪 Peruana' : '🌐 Internacional';
      }
    }

    // Foto de la receta sugerida con carga robusta y fallback infalible
    if (sVisual) {
      sVisual.innerHTML = '';
      const fallbackSrc = window.ZW_FALLBACK_DISH_SVG || (window.ZWStore && ZWStore.FALLBACK_DISH_SVG);

      const img = document.createElement('img');
      img.alt = nombre;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '12px';
      img.style.display = 'block';

      img.onerror = function () {
        this.onerror = null;
        if (fallbackSrc) {
          this.src = fallbackSrc;
        } else {
          this.style.display = 'none';
          sVisual.innerHTML = '<span class="rc-emoji" style="font-size:52px;">🍲</span>';
        }
      };

      img.src = suggested.imagen || fallbackSrc;
      sVisual.appendChild(img);
    }

    // Pastillas de ingredientes disponibles
    const pillsContainer = document.getElementById('suggestedRecipePills');
    if (pillsContainer && Array.isArray(suggested.ingredientes_disponibles)) {
      const disp = suggested.ingredientes_disponibles.slice(0, 3);
      const falt = Array.isArray(suggested.ingredientes_faltantes) ? suggested.ingredientes_faltantes.slice(0, 2) : [];
      let pillsHtml = '';
      disp.forEach(d => {
        const cls = d.es_urgente ? 'rc-ing-pill available urgent' : 'rc-ing-pill available';
        pillsHtml += `<span class="${cls}" style="font-size:11px;padding:2px 7px;border-radius:5px;font-weight:500;">✓ ${d.nombre_despensa || d.nombre}</span>`;
      });
      falt.forEach(f => {
        pillsHtml += `<span class="rc-ing-pill missing" style="font-size:11px;padding:2px 7px;border-radius:5px;background:#F5F5F5;color:#757575;border:1px dashed #BDBDBD;">+ ${f.nombre}</span>`;
      });
      pillsContainer.innerHTML = pillsHtml;
    }
  }

  /* ============ BANCO DE CONSEJOS ============ */
  const TIPS = [
    'Guarda la lechuga envuelta en papel absorbente dentro de un recipiente con cierre. ¡Así puede durar hasta 2 semanas fresca en la refrigeradora!',
    'Para evitar que la palta abierta se oscurezca, pincela la superficie con unas gotas de limón o guárdala junto a un trozo de cebolla.',
    'Congela los plátanos muy maduros pelados y trozados. Son ideales para licuados cremosos, repostería o helados naturales.',
    'Coloca los tallos de hierbas frescas (como culantro o perejil) en un vaso con poca agua como si fueran flores. Se mantendrán vivos por días.',
    'Guarda las papas y cebollas en lugares oscuros y secos, pero NUNCA juntas: desprenden gases que aceleran la descomposición mutua.',
    'Reanima el pan seco humedeciendo la corteza ligeramente con agua y horneándolo a 180°C durante 5 minutos. ¡Volverá a ser crocante!',
    'Aprovecha las cáscaras de verduras limpias (zanahoria, apio, cebolla) guardándolas en una bolsa en el congelador para hacer un delicioso caldo casero.',
    'Los tomates conservan mucho mejor su textura y sabor a temperatura ambiente que dentro de la refrigeradora.'
  ];

  let currentTipIndex = Math.floor(Math.random() * TIPS.length);
  const tipTextEl = document.getElementById('tipText');
  const btnOtroConsejo = document.getElementById('btnOtroConsejo');

  if (tipTextEl) tipTextEl.textContent = TIPS[currentTipIndex];

  if (btnOtroConsejo && tipTextEl) {
    btnOtroConsejo.addEventListener('click', function () {
      btnOtroConsejo.style.transform = 'scale(0.95)';
      setTimeout(() => { btnOtroConsejo.style.transform = ''; }, 150);
      tipTextEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      tipTextEl.style.opacity = '0';
      tipTextEl.style.transform = 'translateY(-4px)';
      setTimeout(() => {
        currentTipIndex = (currentTipIndex + 1) % TIPS.length;
        tipTextEl.textContent = TIPS[currentTipIndex];
        tipTextEl.style.opacity = '1';
        tipTextEl.style.transform = 'translateY(0)';
      }, 200);
    });
  }

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

  if (profileBtn)    profileBtn.addEventListener('click', openProfileModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeProfileModal);
  if (btnCancelModal)btnCancelModal.addEventListener('click', closeProfileModal);
  if (modalOverlay)  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeProfileModal(); });

  if (editForm) {
    editForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const n  = editName?.value.trim()  || 'María Pérez';
      const em = editEmail?.value.trim() || 'maria@correo.com';
      ZWStore.saveUser({ name: n, email: em });
      refreshUser();
      closeProfileModal();
    });
  }

  /* ============ INICIALIZACIÓN ============ */
  // Mostrar datos locales rápido mientras cargan los de Neon
  refreshUser();
  const statsLocal = ZWStore.getStats();
  renderMiniStats(null); // placeholders
  const statA = document.getElementById('statAlimAprovechados');
  const statM = document.getElementById('statAhorroMes');
  const statT = document.getElementById('statTotalFoods');
  if (statA) statA.textContent = statsLocal.itemsSaved;
  if (statM) statM.textContent = 'S/ ' + statsLocal.savings.toFixed(2);
  if (statT) statT.textContent = statsLocal.total;

  // Luego cargar datos frescos de Neon
  cargarDashboard().catch(err => {
    console.warn('Usando datos locales:', err.message);
    renderExpiringList(ZWStore.getFoodsWithStatus().map(f => ({
      nombre: f.name, cantidad: f.qty, ubicacion: f.location,
      fecha_vencimiento: f.expDate, color: f.color, imagen: f.image,
      dias: f.days, badge: f.badge
    })));
    renderRecetaSugerida(ZWStore.getRecipes());
  });

  // Re-renderizar cuando hay sincronización
  window.addEventListener('zw:synced', () => cargarDashboard().catch(() => {}));

})();
