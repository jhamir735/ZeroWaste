/* =============================================
   ZeroWaste – Detalle Receta Inteligente | script.js
   Muestra ingredientes en despensa vs faltantes,
   prioridad de vencimiento y preparación paso a paso
   ============================================= */
'use strict';

(async function () {

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

  /* ---- Obtener ID de la receta desde la URL ---- */
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get('id') || '1';

  // Obtener detalle completo evaluado con la despensa
  const recipe = await ZWStore.getRecipeDetail(rawId);

  /* ---- Elementos del DOM ---- */
  const titleEl = document.getElementById('recipeTitle');
  const timeEl = document.getElementById('statTime');
  const servEl = document.getElementById('statServings');
  const diffEl = document.getElementById('statDiff');
  const pantryEl = document.getElementById('statPantry');
  const alertTextEl = document.getElementById('recipeAlertText');
  const alertBox = document.getElementById('recipeAlertBox');
  const coverImg = document.getElementById('recipeCoverImg');
  const coverFallback = document.getElementById('recipeCoverFallback');
  const originBadge = document.getElementById('recipeOriginBadge');
  const listAvailable = document.getElementById('ingredientListAvailable');
  const listMissing = document.getElementById('ingredientListMissing');
  const countAvailable = document.getElementById('countAvailable');
  const countMissing = document.getElementById('countMissing');
  const groupAvailable = document.getElementById('groupAvailable');
  const groupMissing = document.getElementById('groupMissing');
  const stepListEl = document.getElementById('stepList');
  const btnFav = document.getElementById('btnFavTop');
  const btnCocinada = document.getElementById('btnMarcarCocinada');

  if (titleEl) titleEl.textContent = recipe.nombre || recipe.name || 'Receta ZeroWaste';
  if (timeEl) timeEl.textContent = '⏱️ ' + (recipe.tiempo || recipe.time || '20 min');
  if (servEl) servEl.textContent = '👥 ' + (recipe.porciones || recipe.servings || '2 porciones');
  if (diffEl) diffEl.textContent = '🔥 ' + (recipe.dificultad || recipe.difficulty || 'Media');

  // Porcentaje en despensa
  const pct = recipe.porcentaje_disponible !== undefined ? recipe.porcentaje_disponible : 100;
  if (pantryEl) pantryEl.textContent = `📦 ${pct}% en despensa`;

  // Foto de la receta con fallback infalible
  if (recipe.imagen && coverImg) {
    coverImg.onerror = function () {
      if (window.ZW_FALLBACK_DISH_SVG) {
        coverImg.onerror = null;
        coverImg.src = window.ZW_FALLBACK_DISH_SVG;
      } else {
        coverImg.style.display = 'none';
        if (coverFallback) coverFallback.style.display = 'flex';
      }
    };
    coverImg.src = recipe.imagen;
    coverImg.style.display = 'block';
    if (coverFallback) coverFallback.style.display = 'none';
  } else if (coverFallback) {
    coverFallback.style.display = 'flex';
  }

  // Insignia de origen
  if (originBadge) {
    if (recipe.es_ia) {
      originBadge.innerHTML = '✨ Sugerencia de Chef IA';
      originBadge.style.background = 'linear-gradient(135deg, #1E7A46 0%, #2F9E5B 100%)';
    } else if (recipe.area === 'Peruana' || recipe.origen === 'peruana') {
      originBadge.innerHTML = '🇵🇪 Cocina Peruana';
      originBadge.style.background = '#C62828';
    } else {
      originBadge.innerHTML = `🌐 ${recipe.area || 'Internacional'}`;
    }
  }

  // Alerta de aprovechamiento de alimentos
  if (alertTextEl) {
    if (recipe.aprovecha_urgentes && recipe.ingredientes_disponibles) {
      const urg = recipe.ingredientes_disponibles.filter(d => d.es_urgente);
      alertTextEl.innerHTML = `🚨 <strong>¡Prioridad alta!</strong> Esta receta aprovecha <strong>${urg.length} ingrediente(s)</strong> próximos a vencer: <span>${urg.map(u => u.nombre_despensa || u.nombre).join(', ')}</span>.`;
      if (alertBox) {
        alertBox.style.background = 'var(--urgent-bg)';
        alertBox.style.color = 'var(--urgent-text)';
      }
    } else if (recipe.puede_cocinar_ya) {
      alertTextEl.innerHTML = `🍳 <strong>¡Todo listo!</strong> Tienes el 100% de los ingredientes necesarios en tu despensa. ¡A cocinar!`;
      if (alertBox) {
        alertBox.style.background = 'var(--success-bg)';
        alertBox.style.color = 'var(--primary)';
      }
    } else {
      alertTextEl.textContent = recipe.texto_ahorro || recipe.savesText || 'Aprovecha al máximo tus alimentos y reduce el desperdicio en casa.';
    }
  }

  // Renderizar ingredientes disponibles
  const disponibles = Array.isArray(recipe.ingredientes_disponibles)
    ? recipe.ingredientes_disponibles
    : (recipe.ingredientes || recipe.ingredients || []).map(i => ({
        nombre: typeof i === 'string' ? i : (i.nombre || i.name),
        cantidad_requerida: i.cantidad || ''
      }));

  if (countAvailable) countAvailable.textContent = disponibles.length;

  if (listAvailable) {
    listAvailable.innerHTML = '';
    if (disponibles.length === 0 && groupAvailable) {
      groupAvailable.style.display = 'none';
    } else {
      disponibles.forEach((ing, idx) => {
        const li = document.createElement('li');
        li.className = 'ing-item';
        
        let badgeHtml = '';
        if (ing.es_urgente) {
          const textVence = ing.dias_restantes <= 0 ? 'Vence hoy' : `Vence en ${ing.dias_restantes} d`;
          badgeHtml = `<span class="ing-badge urgent">🚨 ${textVence}</span>`;
        } else if (ing.dias_restantes !== undefined) {
          badgeHtml = `<span class="ing-badge safe">✓ En despensa</span>`;
        }

        const cantText = ing.cantidad_requerida ? ` &bull; <small style="color:var(--text-sec);">${ing.cantidad_requerida}</small>` : '';

        li.innerHTML = `
          <div class="ing-item-left">
            <div class="ing-box" id="box-disp-${idx}"></div>
            <span class="ing-text"><strong>${ing.nombre_despensa || ing.nombre}</strong>${cantText}</span>
          </div>
          ${badgeHtml}
        `;
        listAvailable.appendChild(li);
      });
    }
  }

  // Renderizar ingredientes faltantes
  const faltantes = Array.isArray(recipe.ingredientes_faltantes) ? recipe.ingredientes_faltantes : [];
  if (countMissing) countMissing.textContent = faltantes.length;

  if (listMissing) {
    listMissing.innerHTML = '';
    if (faltantes.length === 0 && groupMissing) {
      groupMissing.style.display = 'none';
    } else {
      if (groupMissing) {
        const noBasicos = faltantes.filter(f => !f.es_basico);
        const groupTitle = groupMissing.querySelector('.ing-group-title');
        if (groupTitle) {
          if (noBasicos.length === 0) {
            groupTitle.innerHTML = '<span>🧂</span> Condimentos básicos de cocina (<span id="countMissing">' + faltantes.length + '</span>)';
          } else {
            groupTitle.innerHTML = '<span>🛒</span> Ingredientes adicionales para comprar (<span id="countMissing">' + noBasicos.length + '</span>)';
          }
        }
      }

      faltantes.forEach((ing, idx) => {
        const li = document.createElement('li');
        li.className = 'ing-item';
        const cantText = ing.cantidad ? ` &bull; <small style="color:var(--text-sec);">${ing.cantidad}</small>` : '';

        const badgeHtml = ing.es_basico
          ? `<span class="ing-badge" style="background:#EBF3FA;color:#2C5282;font-size:11px;font-weight:600;">🧂 En toda cocina</span>`
          : `<span class="ing-badge missing">🛒 Comprar</span>`;

        li.innerHTML = `
          <div class="ing-item-left">
            <div class="ing-box" id="box-miss-${idx}"></div>
            <span class="ing-text">${ing.nombre}${cantText}</span>
          </div>
          ${badgeHtml}
        `;
        listMissing.appendChild(li);
      });
    }
  }

  // Traductor y limpiador de pasos al español para garantizar que siempre se lean en español
  function asegurarPasoEnEspanol(paso) {
    if (!paso || typeof paso !== 'string') return '';
    let p = paso.trim();

    const dict = [
      [/preheat (the )?oven to (\d+)[° ]?c/gi, 'Precalienta el horno a $2°C'],
      [/preheat (the )?oven to (\d+)[° ]?f/gi, 'Precalienta el horno a $2°F (180°C)'],
      [/preheat (the )?oven/gi, 'Precalienta el horno'],
      [/bring (a large pot of water )?to a boil/gi, 'Pon a hervir una olla con agua y sal'],
      [/heat (the )?(olive |vegetable )?oil in a (large )?(pan|skillet|pot|wok)/gi, 'Calienta aceite en una sartén a fuego medio'],
      [/in a (large )?(bowl|pan|pot),? (mix|combine|whisk|stir together)/gi, 'En un tazón grande, mezcla'],
      [/season with salt and pepper/gi, 'sazona con sal y pimienta al gusto'],
      [/season to taste/gi, 'sazona al gusto'],
      [/reduce heat and simmer/gi, 'reduce a fuego bajo y cocina a fuego lento'],
      [/cook (for )?(\d+)[- ](\d+)? ?(minutes?|mins?)/gi, 'cocina durante $2-$3 minutos'],
      [/cook for (\d+) (minutes?|mins?)/gi, 'cocina durante $1 minutos'],
      [/bake for (\d+) (minutes?|mins?)/gi, 'hornea durante $1 minutos'],
      [/until golden (brown)?/gi, 'hasta que esté bien dorado'],
      [/until tender/gi, 'hasta que quede suave'],
      [/stir occasionally/gi, 'remueve de vez en cuando'],
      [/stir well/gi, 'mezcla todo muy bien'],
      [/drain and set aside/gi, 'cuela y reserva'],
      [/drain off excess/gi, 'escurre el exceso de'],
      [/squeeze lime over/gi, 'exprime limón sobre el'],
      [/rub well/gi, 'frota e impregna bien'],
      [/rinse with cold water/gi, 'enjuaga con agua fría'],
      [/set aside/gi, 'reserva para después'],
      [/garnish with/gi, 'decora al servir con'],
      [/serve hot with/gi, 'sirve caliente acompañado de'],
      [/serve immediately/gi, 'sirve de inmediato bien caliente'],
      [/serve with/gi, 'sirve con'],
      [/finely chop(ped)?/gi, 'pica finamente'],
      [/cut into (cubes|pieces|slices)/gi, 'corta en dados o rodajas'],
      [/chicken breast/gi, 'pechuga de pollo'],
      [/chicken/gi, 'pollo'],
      [/onions?/gi, 'cebolla'],
      [/garlic/gi, 'ajo'],
      [/tomatoes?/gi, 'tomate'],
      [/potatoes?/gi, 'papas'],
      [/fish/gi, 'pescado'],
      [/rice/gi, 'arroz'],
      [/eggs?/gi, 'huevos'],
      [/milk/gi, 'leche'],
      [/lime juice/gi, 'jugo de limón'],
      [/minutes?/gi, 'minutos'],
      [/seconds?/gi, 'segundos']
    ];

    dict.forEach(([regex, rep]) => {
      p = p.replace(regex, rep);
    });

    return p.charAt(0).toUpperCase() + p.slice(1);
  }

  // Renderizar pasos
  const pasos = Array.isArray(recipe.pasos) ? recipe.pasos : (recipe.steps || []);
  if (stepListEl) {
    stepListEl.innerHTML = '';
    pasos.forEach(step => {
      const li = document.createElement('li');
      li.className = 'step-item';
      li.textContent = asegurarPasoEnEspanol(step);
      stepListEl.appendChild(li);
    });
  }

  // Checkboxes interactivos
  document.addEventListener('click', function (e) {
    const item = e.target.closest('.ing-item');
    if (!item) return;
    const box = item.querySelector('.ing-box');
    if (!box) return;

    box.classList.toggle('checked');
    item.classList.toggle('checked', box.classList.contains('checked'));
  });

  // Favoritos
  function updateFavIcon (isFav) {
    if (!btnFav) return;
    btnFav.classList.toggle('active', isFav);
    btnFav.innerHTML = isFav
      ? '<svg viewBox="0 0 24 24" fill="#C62828" width="24" height="24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="24" height="24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
  }

  const recipeIdRef = recipe.id || recipe.receta_id_externo || rawId;
  updateFavIcon(ZWStore.isFavorite(recipeIdRef));

  btnFav?.addEventListener('click', async function () {
    const f = await ZWStore.toggleFavorite(recipeIdRef);
    updateFavIcon(f);
    btnFav.style.transform = 'scale(1.25)';
    setTimeout(() => { btnFav.style.transform = ''; }, 180);
    showToast(f ? '❤️ Añadida a tus recetas favoritas' : '🤍 Eliminada de favoritos');
  });

  // Botón "Marcar como cocinada"
  function setCocinadaDone () {
    if (!btnCocinada) return;
    btnCocinada.classList.add('done');
    btnCocinada.innerHTML = '✅ Receta cocinada y alimentos descontados de Neon';
    btnCocinada.style.pointerEvents = 'none';
  }

  if (ZWStore.isCooked(recipeIdRef)) {
    setCocinadaDone();
  }

  btnCocinada?.addEventListener('click', async function () {
    if (btnCocinada.classList.contains('done')) return;
    btnCocinada.disabled = true;
    btnCocinada.innerHTML = '⏳ Registrando cocinado en Neon...';

    try {
      await ZWStore.markCooked(recipeIdRef);
      setCocinadaDone();

      // Marcar todos los checkboxes de ingredientes
      document.querySelectorAll('.ing-box').forEach(b => {
        b.classList.add('checked');
        b.closest('.ing-item')?.classList.add('checked');
      });

      showToast('🎉 ¡Felicidades! Receta cocinada e ingredientes descontados de tu despensa.');
      
      // Sincronizar en segundo plano
      setTimeout(() => {
        ZWStore.syncFromBackend();
      }, 500);

    } catch (err) {
      console.error(err);
      showToast('⚠️ Receta marcada localmente');
      setCocinadaDone();
    }
  });

  function showToast (msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); }, 3000);
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

})();
