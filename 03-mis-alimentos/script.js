/* =============================================
   ZeroWaste – Mis Alimentos | script.js
   ============================================= */
'use strict';

(function () {

  /* ---- Usuario y Sidebar ---- */
  function refreshUser () {
    const user = ZWStore.getUser();
    const sbName = document.getElementById('sbUserName');
    const sbEmail = document.getElementById('sbUserEmail');
    const sbAv = document.getElementById('sbAvatar');
    if (sbName) sbName.textContent = user.name;
    if (sbEmail && user.email) sbEmail.textContent = user.email;
    if (sbAv) sbAv.textContent = (user.name || 'M').charAt(0).toUpperCase();
  }
  refreshUser();

  let activeFilter = 'todos';
  let searchQuery = '';
  let lastDeletedItem = null;

  /* ---- Renderizar lista de alimentos ---- */
  function renderFoods () {
    const foods = ZWStore.getFoodsWithStatus();
    const list = document.getElementById('foodList');
    const empty = document.getElementById('emptyState');
    if (!list) return;

    list.innerHTML = '';

    const filtered = foods.filter(function (f) {
      const matchCat = (activeFilter === 'todos') || (f.category === activeFilter);
      const query = searchQuery.toLowerCase().trim();
      const matchSearch = !query ||
        f.name.toLowerCase().includes(query) ||
        (f.location && f.location.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      if (empty) empty.style.display = 'flex';
    } else {
      if (empty) empty.style.display = 'none';
      filtered.forEach(function (food, i) {
        const li = document.createElement('li');
        const urgencyCls = (food.days <= 0) ? 'card-urgent' : ((food.days <= 3) ? 'card-warning' : 'card-safe');
        li.className = 'food-card ' + urgencyCls;
        li.style.animationDelay = (i * 40) + 'ms';
        li.dataset.id = food.id;

        let avatarContent = food.initial;
        if (food.image) {
          avatarContent = '<img src="' + food.image + '" alt="' + food.name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
        }

        const qtyLabel = food.qty + (food.qty === 1 ? ' unidad' : ' unidades');

        li.innerHTML =
          '<div class="fc-main-row">' +
            '<div class="food-avatar" style="background:' + food.color + ';">' + avatarContent + '</div>' +
            '<div class="fc-info">' +
              '<div class="fc-name">' + food.name + '</div>' +
              '<div class="fc-location">📍 ' + (food.location || 'Despensa') + '</div>' +
            '</div>' +
            '<div class="fc-right-actions">' +
              '<span class="badge ' + food.badge.cls + '">' + food.badge.text + '</span>' +
              '<button class="fc-delete" data-id="' + food.id + '" aria-label="Eliminar ' + food.name + '" title="Eliminar alimento">✕</button>' +
            '</div>' +
          '</div>' +
          '<div class="fc-bottom-row">' +
            '<span class="fc-qty-label">Cantidad disponible:</span>' +
            '<div class="qty-stepper" data-id="' + food.id + '" data-name="' + food.name + '">' +
              '<button type="button" class="btn-qty-step minus" data-id="' + food.id + '" data-name="' + food.name + '" title="Usar 1 unidad" aria-label="Usar 1 unidad">−</button>' +
              '<span class="qty-stepper-val" title="Cantidad disponible">' + food.qty + (food.qty === 1 ? ' unidad' : ' unidades') + '</span>' +
              '<button type="button" class="btn-qty-step plus" data-id="' + food.id + '" data-name="' + food.name + '" title="Añadir 1 unidad" aria-label="Añadir 1 unidad">+</button>' +
            '</div>' +
          '</div>';

        list.appendChild(li);
      });
    }

    updateSummary(foods);
  }

  function updateSummary (foods) {
    const urgent = foods.filter(function (f) { return f.days <= 0; }).length;
    const warn = foods.filter(function (f) { return f.days > 0 && f.days <= 3; }).length;
    const total = foods.length;

    const su = document.getElementById('ssUrgent');
    const sw = document.getElementById('ssWarn');
    const st = document.getElementById('ssTotal');
    if (su) su.textContent = urgent;
    if (sw) sw.textContent = warn;
    if (st) st.textContent = total;

    // Sincronizar badges en layout
    ZWStore.syncUI();
  }

  /* ---- Pestañas de filtro ---- */
  document.getElementById('filterTabs')?.addEventListener('click', function (e) {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    document.querySelectorAll('.filter-tab').forEach(function (t) { t.classList.remove('active'); });
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    renderFoods();
  });

  /* ---- Búsqueda (escritorio + móvil) ---- */
  function onSearch (e) {
    searchQuery = e.target.value.toLowerCase().trim();
    renderFoods();
    const other = e.target.id === 'searchInput' ? 'searchInputMobile' : 'searchInput';
    const otherEl = document.getElementById(other);
    if (otherEl) otherEl.value = e.target.value;
  }

  document.getElementById('searchInput')?.addEventListener('input', onSearch);
  document.getElementById('searchInputMobile')?.addEventListener('input', onSearch);

  /* ---- Stepper de cantidad (+ / - para usar un poco) ---- */
  document.getElementById('foodList')?.addEventListener('click', async function (e) {
    const btnMinus = e.target.closest('.btn-qty-step.minus');
    const btnPlus = e.target.closest('.btn-qty-step.plus');
    if (!btnMinus && !btnPlus) return;

    e.preventDefault();
    e.stopPropagation();

    const targetBtn = btnMinus || btnPlus;
    const id = parseInt(targetBtn.dataset.id, 10);
    const name = targetBtn.dataset.name || 'Alimento';
    const isMinus = !!btnMinus;

    const foods = ZWStore.getFoods();
    const food = foods.find(function (f) { return Number(f.id) === id; });
    if (!food) return;

    const currentQty = parseInt(food.qty, 10) || 1;
    const newQty = isMinus ? (currentQty - 1) : (currentQty + 1);

    if (isMinus && newQty <= 0) {
      lastDeletedItem = food;
      await ZWStore.updateFoodQty(id, 0, 'consumido');
      renderFoods();
      showToast('🎉 ¡Terminaste todo el ' + name + '! Registrado en tu historial.', true);
      return;
    }

    try {
      await ZWStore.updateFoodQty(id, newQty);
      renderFoods();
      if (isMinus) {
        showToast('🥄 Usaste 1 de ' + name + '. Quedan ' + newQty + ' y quedó registrado en tu historial.', false);
      } else {
        showToast('➕ Añadiste 1 unidad de ' + name + ' (Total: ' + newQty + ').', false);
      }
    } catch (err) {
      console.error(err);
      showToast('⚠️ No se pudo actualizar la cantidad: ' + err.message);
    }
  });

  /* ---- Eliminar con opción de Deshacer (Undo) ---- */
  document.getElementById('foodList')?.addEventListener('click', async function (e) {
    const btn = e.target.closest('.fc-delete');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    const card = btn.closest('.food-card');

    // Buscar el item antes de eliminarlo para poder deshacer
    const currentFoods = ZWStore.getFoods();
    lastDeletedItem = currentFoods.find(function (f) { return Number(f.id) === id; });
    const itemName = lastDeletedItem ? lastDeletedItem.name : '';

    if (card) {
      card.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.92)';
    }

    try {
      const res = await ZWStore.removeFood(id, itemName, 'eliminado');
      renderFoods();
      if (res && res.deletedInBackend) {
        showToast('🗑 Alimento eliminado y guardado en tu historial', true);
      } else {
        showToast('🗑 Alimento eliminado de tu inventario', true);
      }
    } catch (err) {
      renderFoods();
      showToast('⚠️ Error al eliminar alimento: ' + err.message);
    }
  });

  /* ---- Notificación toast ---- */
  let toastTimer = null;
  function showToast (msg, allowUndo) {
    const t = document.getElementById('toast');
    if (!t) return;
    if (toastTimer) clearTimeout(toastTimer);

    if (allowUndo && lastDeletedItem) {
      t.innerHTML =
        '<div style="display:flex;align-items:center;gap:14px;">' +
          '<span>' + msg + '</span>' +
          '<button id="btnUndoToast" style="background:var(--primary);color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Deshacer</button>' +
        '</div>';

      const undoBtn = document.getElementById('btnUndoToast');
      if (undoBtn) {
        undoBtn.addEventListener('click', function () {
          if (lastDeletedItem) {
            ZWStore.addFood(lastDeletedItem);
            lastDeletedItem = null;
            renderFoods();
            t.classList.remove('show');
          }
        });
      }
    } else {
      t.textContent = msg;
    }

    t.classList.add('show');
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
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

  /* ---- Exportar inventario ---- */
  async function exportarInventario (formato, button) {
    const original = button ? button.innerHTML : '';
    if (button) {
      button.disabled = true;
      button.innerHTML = '⏳...';
    }
    try {
      const filename = await ZWStore.downloadReport('inventario', formato);
      showToast('📄 Inventario descargado: ' + filename, false);
    } catch (err) {
      showToast('⚠️ ' + err.message, false);
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  }

  document.getElementById('btnExportInventarioPdf')?.addEventListener('click', function () {
    exportarInventario('pdf', this);
  });
  document.getElementById('btnExportInventarioExcel')?.addEventListener('click', function () {
    exportarInventario('excel', this);
  });

  /* ---- Inicializar ---- */
  window.addEventListener('zw:synced', renderFoods);
  renderFoods();

})();
