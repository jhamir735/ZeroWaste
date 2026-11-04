/* =============================================
   ZeroWaste – Recetas Inteligentes | script.js
   Recomendaciones según despensa, vencimiento,
   APIs gastronómicas y generación por IA
   ============================================= */
'use strict';

(function () {

  /* ---- Usuario y Sidebar ---- */
  function refreshUser () {
    const user = ZWStore.getUser();
    const sbName = document.getElementById('sbUserName');
    const sbEmail = document.getElementById('sbUserEmail');
    const sbAv   = document.getElementById('sbAvatar');
    if (sbName) sbName.textContent = user.name;
    if (sbEmail && user.email) sbEmail.textContent = user.email;
    if (sbAv)   sbAv.textContent   = (user.name || 'M').charAt(0).toUpperCase();
  }
  refreshUser();

  let activeTab = 'listas'; // Por defecto: SOLO recetas listas para cocinar con lo que hay en despensa
  let searchQuery = '';
  let recipesCache = [];
  let isLoading = false;

  const list = document.getElementById('recipeList');
  const empty = document.getElementById('emptyState');
  const btnChefIA = document.getElementById('btnGenerarIA');

  /**
   * Carga recomendaciones desde la API del backend
   */
  async function loadRecommendations () {
    if (isLoading) return;
    isLoading = true;

    if (list && recipesCache.length === 0) {
      list.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding:50px 20px;">
          <div style="font-size:36px; margin-bottom:12px; animation:spin 1s infinite linear;">🍲</div>
          <p style="font-weight:700; color:var(--text-main); font-size:15px;">Consultando tu despensa en Neon...</p>
          <p style="color:var(--text-sec); font-size:13px;">Buscando recetas que puedes preparar hoy sin comprar más ingredientes</p>
        </div>
      `;
    }

    try {
      const res = await ZWStore.fetchRecommendations('todas', searchQuery);
      if (res && Array.isArray(res.data)) {
        recipesCache = res.data;
      }
    } catch (err) {
      console.warn('Usando catálogo local:', err.message);
      recipesCache = ZWStore.getRecipes();
    } finally {
      isLoading = false;
      render();
    }
  }

  /**
   * Renderiza las tarjetas de recetas
   */
  function render () {
    if (!list) return;
    list.innerHTML = '';
    const favs = ZWStore.getFavorites().map(String);

    const filtered = recipesCache.filter(function (r) {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        r.nombre.toLowerCase().includes(q) ||
        (r.area && r.area.toLowerCase().includes(q)) ||
        (r.ingredientes_disponibles && r.ingredientes_disponibles.some(i => i.nombre.toLowerCase().includes(q))) ||
        (r.ingredientes_faltantes && r.ingredientes_faltantes.some(i => i.nombre.toLowerCase().includes(q)));

      let matchTab = true;
      if (activeTab === 'listas') {
        // Si hay una búsqueda activa por texto, mostrar resultados relevantes
        matchTab = (q.length >= 3) ? true : r.puede_cocinar_ya;
      } else if (activeTab === 'urgentes') {
        matchTab = r.aprovecha_urgentes;
      } else if (activeTab === 'ia') {
        matchTab = r.es_ia;
      } else if (activeTab === 'comprar') {
        matchTab = !r.puede_cocinar_ya;
      } else if (activeTab === 'favoritas') {
        matchTab = favs.includes(String(r.id)) || favs.includes(String(r.receta_id_externo));
      }

      return matchSearch && matchTab;
    });

    if (filtered.length === 0) {
      if (empty) empty.style.display = 'block';
    } else {
      if (empty) empty.style.display = 'none';

      filtered.forEach(function (r, i) {
        const idStr = String(r.id || r.receta_id_externo);
        const isFav = favs.includes(idStr);
        const favIcon = isFav
          ? '<svg viewBox="0 0 24 24" fill="#C62828" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';

        // Insignia de origen
        let originBadge = '';
        if (r.es_ia) {
          originBadge = '<span class="rc-origin-badge badge-ia">✨ Chef IA</span>';
        } else if (r.area === 'Peruana' || r.origen === 'peruana') {
          originBadge = '<span class="rc-origin-badge" style="background:#C62828;">🇵🇪 Peruana</span>';
        } else {
          originBadge = `<span class="rc-origin-badge">🌐 ${r.area || 'Internacional'}</span>`;
        }

        // Tira de alerta / estado
        let alertStrip = '';
        if (r.puede_cocinar_ya && r.aprovecha_urgentes) {
          alertStrip = `<div class="rc-alert-strip ready" style="background:#E6F4EA;color:#1E7A46;border-left:3px solid #C62828;">🍳 ¡Lista para cocinar! · 🚨 Salva ${r.salva_urgentes_count} por vencer</div>`;
        } else if (r.puede_cocinar_ya) {
          alertStrip = '<div class="rc-alert-strip ready">🍳 ¡Lista para cocinar! · 100% en despensa</div>';
        } else if (r.aprovecha_urgentes) {
          alertStrip = `<div class="rc-alert-strip urgent">🚨 Salva ${r.salva_urgentes_count} alimento(s) por vencer</div>`;
        } else if (r.ingredientes_faltantes && r.ingredientes_faltantes.length > 0) {
          alertStrip = `<div class="rc-alert-strip missing">🛒 Faltan ${r.faltantes_no_basicos_count || r.ingredientes_faltantes.length} ingrediente(s)</div>`;
        }

        // Pastillas de ingredientes (priorizar los disponibles en despensa)
        let pillsHtml = '';
        const disp = Array.isArray(r.ingredientes_disponibles) ? r.ingredientes_disponibles.slice(0, 4) : [];
        const falt = Array.isArray(r.ingredientes_faltantes) ? r.ingredientes_faltantes.filter(f => !f.es_basico).slice(0, 2) : [];

        disp.forEach(d => {
          const cls = d.es_urgente ? 'rc-ing-pill available urgent' : 'rc-ing-pill available';
          pillsHtml += `<span class="${cls}">✓ ${d.nombre_despensa || d.nombre}</span>`;
        });

        falt.forEach(f => {
          pillsHtml += `<span class="rc-ing-pill missing">+ ${f.nombre}</span>`;
        });

        // Imagen con fallback
        const imgTag = r.imagen
          ? `<img src="${r.imagen}" alt="${r.nombre}" class="rc-img" loading="lazy" onerror="this.onerror=null;if(window.ZW_FALLBACK_DISH_SVG)this.src=window.ZW_FALLBACK_DISH_SVG;" />`
          : `<div style="width:100%;height:100%;background:${r.color || '#1E7A46'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px;font-weight:700;">${r.inicial || 'R'}</div>`;

        const el = document.createElement('a');
        el.className = 'recipe-card';
        el.href = `../07-detalle-receta/index.html?id=${encodeURIComponent(idStr)}`;
        el.style.animationDelay = (i * 35) + 'ms';
        el.style.animation = `cardIn 0.4s ease ${i * 35}ms both`;

        el.innerHTML = `
          <div class="rc-top">
            ${imgTag}
            ${originBadge}
            <button type="button" class="rc-fav-overlay ${isFav ? 'active' : ''}" data-id="${idStr}" aria-label="Favorito" title="Favorito">
              ${favIcon}
            </button>
          </div>
          <div class="rc-body">
            <h3 class="rc-title">${r.nombre}</h3>
            ${alertStrip}
            <div class="rc-ingredients-summary">
              ${pillsHtml}
            </div>
            <div class="rc-footer">
              <div class="rc-meta-chips">
                <span class="rc-chip">⏱️ ${r.tiempo || '25 min'}</span>
                <span class="rc-chip">🔥 ${r.dificultad || 'Media'}</span>
              </div>
              <span style="font-weight:700; color:var(--primary); font-size:12px;">Ver receta &rarr;</span>
            </div>
          </div>
        `;

        list.appendChild(el);
      });
    }
  }

  // Generador con Chef IA
  btnChefIA?.addEventListener('click', async function () {
    btnChefIA.disabled = true;
    const oldText = btnChefIA.innerHTML;
    btnChefIA.innerHTML = '<span>⏳</span> Chef IA cocinando receta...';

    showToast('👨‍🍳 El Chef IA está analizando tus alimentos en Neon...');

    try {
      const nuevaReceta = await ZWStore.generateAiRecipe();
      showToast('🎉 ¡Receta generada por el Chef IA con éxito!');
      activeTab = 'ia';
      document.querySelectorAll('.recipe-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'ia'));
      await loadRecommendations();
    } catch (err) {
      console.error(err);
      showToast('⚠️ No se pudo generar la receta: ' + err.message);
    } finally {
      btnChefIA.disabled = false;
      btnChefIA.innerHTML = oldText;
    }
  });

  // Pestañas
  document.getElementById('recipeTabs')?.addEventListener('click', function (e) {
    const tab = e.target.closest('.recipe-tab');
    if (!tab) return;
    document.querySelectorAll('.recipe-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    render();
  });

  // Búsqueda con consulta a APIs externas (TheMealDB)
  let searchDebounceTimer = null;
  function onSearch (e) {
    searchQuery = e.target.value.toLowerCase().trim();
    render();
    const other = e.target.id === 'searchReceta' ? 'searchRecetaMobile' : 'searchReceta';
    const oEl = document.getElementById(other);
    if (oEl) oEl.value = e.target.value;

    clearTimeout(searchDebounceTimer);
    if (searchQuery.length >= 3) {
      searchDebounceTimer = setTimeout(async function () {
        try {
          const res = await ZWStore.fetchRecommendations('todas', searchQuery);
          if (res && Array.isArray(res.data) && res.data.length > 0) {
            const seenIds = new Set(recipesCache.map(r => String(r.id || r.receta_id_externo)));
            let addedCount = 0;
            for (const r of res.data) {
              const id = String(r.id || r.receta_id_externo);
              if (!seenIds.has(id)) {
                recipesCache.push(r);
                seenIds.add(id);
                addedCount++;
              }
            }
            if (addedCount > 0) {
              render();
            }
          }
        } catch (err) {
          console.warn('Error en búsqueda externa:', err.message);
        }
      }, 400);
    }
  }
  document.getElementById('searchReceta')?.addEventListener('input', onSearch);
  document.getElementById('searchRecetaMobile')?.addEventListener('input', onSearch);

  // Toggle favoritos
  list?.addEventListener('click', async function (e) {
    const btn = e.target.closest('.rc-fav-overlay');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      const isFav = await ZWStore.toggleFavorite(id);
      btn.classList.toggle('active', isFav);
      btn.innerHTML = isFav
        ? '<svg viewBox="0 0 24 24" fill="#C62828" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';

      btn.style.transform = 'scale(1.25)';
      setTimeout(() => { btn.style.transform = ''; }, 180);
      showToast(isFav ? '❤️ Receta guardada en favoritos' : '🤍 Receta quitada de favoritos');

      if (activeTab === 'favoritas' && !isFav) {
        setTimeout(render, 280);
      }
    }
  });

  function showToast (msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); }, 2600);
  }

  /* ---- Modal de edición rápida de perfil ---- */
  const profileBtn = document.getElementById('sidebarProfileBtn');
  const modalOverlay = document.getElementById('profileModalOverlay');
  const btnCloseModal = document.getElementById('btnCloseProfileModal');
  const btnCancelModal = document.getElementById('btnCancelProfileModal');
  const editForm = document.getElementById('profileEditForm');
  const editName = document.getElementById('editUserName');
  const editEmail = document.getElementById('editUserEmail');

  function openProfileModal () {
    const u = ZWStore.getUser();
    if (editName) editName.value = u.name || '';
    if (editEmail) editEmail.value = u.email || '';
    if (modalOverlay) modalOverlay.classList.add('open');
  }

  function closeProfileModal () {
    if (modalOverlay) modalOverlay.classList.remove('open');
  }

  if (profileBtn) profileBtn.addEventListener('click', openProfileModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeProfileModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeProfileModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) closeProfileModal();
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const n = editName?.value.trim() || 'Usuario';
      const em = editEmail?.value.trim() || '';
      ZWStore.saveUser({ name: n, email: em });
      refreshUser();
      closeProfileModal();
    });
  }

  // Inicializar cargando recomendaciones inteligentes
  loadRecommendations();

})();
