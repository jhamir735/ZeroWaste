/* =============================================
   ZeroWaste – Alertas | script.js
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

  const container = document.getElementById('alertsContainer');
  let recipes = ZWStore.getRecipes();

  // Intentar cargar recetas inteligentes del backend para sugerencias en alertas
  ZWStore.fetchRecommendations('urgentes').then(function (res) {
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      recipes = res.data;
    }
  }).catch(function () {
    // Usar catálogo local si falla
  });

  function findRecipeForFood (foodName) {
    const fn = (foodName || '').toLowerCase();
    for (let r of recipes) {
      // Buscar en ingredientes disponibles evaluados
      const disp = Array.isArray(r.ingredientes_disponibles)
        ? r.ingredientes_disponibles.map(function(i){ return i.nombre_despensa || i.nombre || ''; })
        : [];
      const saved = disp.length > 0 ? disp : (r.savedIngredients || r.ingredientes_salvados || (r.ingredientes ? r.ingredientes.map(function(i){ return i.nombre || i.name || i; }) : []));
      if (saved.some(function (ing) { return fn.includes(String(ing).toLowerCase()) || String(ing).toLowerCase().includes(fn); })) {
        return r.receta_id_externo || r.id || 1;
      }
    }
    return 1;
  }

  function renderAlerts () {
    const foods = ZWStore.getFoodsWithStatus();

    // Categorizar según urgencia
    const urgent = foods.filter(function (f) { return f.days <= 0; });
    const warn   = foods.filter(function (f) { return f.days > 0 && f.days <= 3; });
    const safe   = foods.filter(function (f) { return f.days > 3; });

    // Actualizar contadores
    const urgentCount = document.getElementById('urgentCount');
    if (urgentCount) urgentCount.textContent = urgent.length;

    const totalAlerts = urgent.length + warn.length;
    ['sbBadge', 'mnBadge'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        if (totalAlerts > 0) {
          el.textContent = totalAlerts;
          el.style.display = 'flex';
        } else {
          el.style.display = 'none';
        }
      }
    });

    // Renderizar grupos de alerta
    let html = '';
    let animDelay = 0;

    function renderGroup (title, dotCls, list, isUrgent) {
      if (list.length === 0) return;
      html += '<section class="alert-section">';
      html += '  <div class="section-heading"><span class="dot ' + dotCls + '"></span><h2 class="section-title">' + title + ' (' + list.length + ')</h2></div>';
      html += '  <div class="alert-list">';
      list.forEach(function (f) {
        const cardCls = isUrgent ? 'alert-card urgent-card' : 'alert-card';
        const recipeId = findRecipeForFood(f.name);
        const qtyLabel = f.qty + (f.qty === 1 ? ' unidad' : ' unidades');

        let avatarContent = f.initial;
        if (f.image) {
          avatarContent = '<img src="' + f.image + '" alt="' + f.name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
        }

        html += '    <div class="' + cardCls + '" id="alert-item-' + f.id + '" style="animation-delay:' + (animDelay * 50) + 'ms">';
        html += '      <div class="food-avatar" style="background:' + f.color + '">' + avatarContent + '</div>';
        html += '      <div class="alert-info">';
        html += '        <p class="alert-food-name">' + f.name + '</p>';
        html += '        <p class="alert-meta">' + qtyLabel + ' • ' + f.location + '</p>';
        html += '      </div>';
        html += '      <div class="alert-actions">';
        if (isUrgent) {
          html += '        <a href="../07-detalle-receta/index.html?id=' + encodeURIComponent(recipeId) + '" class="btn-primary-sm" style="padding:6px 12px;font-size:12px;">Ver receta</a>';
        } else {
          html += '        <span class="badge ' + f.badge.cls + '">' + f.badge.text + '</span>';
        }
        html += '        <button type="button" class="btn-consumido" data-id="' + f.id + '" data-name="' + f.name + '" title="Marcar como consumido">✓ Ya lo usé</button>';
        html += '      </div>';
        html += '    </div>';
        animDelay++;
      });
      html += '  </div></section>';
    }

    if (foods.length === 0) {
      html =
        '<div class="empty-alert">' +
          '<div style="font-size:42px;margin-bottom:12px;">🎉</div>' +
          '<strong>¡Tu inventario está vacío!</strong>' +
          '<p style="margin-top:6px;font-size:13px;color:var(--text-sec);">Registra alimentos para llevar un control automático de sus fechas de vencimiento.</p>' +
          '<a href="../04-registrar-alimento/index.html" class="btn-primary-sm" style="margin-top:14px;display:inline-flex;">+ Registrar alimento</a>' +
        '</div>';
    } else {
      renderGroup('Vencen hoy', 'dot-urgent', urgent, true);
      renderGroup('Próximos a vencer (1 a 3 días)', 'dot-warning', warn, false);
      renderGroup('Tiempo suficiente', 'dot-safe', safe, false);

      if (urgent.length === 0 && warn.length === 0) {
        html =
          '<div class="empty-alert" style="margin-bottom:20px;background:#E6F4EA;color:var(--primary);">' +
            '✨ <strong>¡Todo bajo control!</strong> No tienes alimentos por vencer en los próximos 3 días.' +
          '</div>' + html;
      }
    }

    if (container) container.innerHTML = html;
  }

  // Delegación de evento para botón "Ya lo usé"
  container?.addEventListener('click', async function (e) {
    const btn = e.target.closest('.btn-consumido');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    const name = btn.dataset.name || 'Alimento';
    const card = document.getElementById('alert-item-' + id);

    if (card) {
      card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.9)';
    }

    try {
      const res = await ZWStore.removeFood(id, name);
      renderAlerts();
      if (res && res.deletedInBackend) {
        showToast('✨ ' + name + ' marcado como consumido y actualizado en Neon.');
      } else {
        showToast('✨ ' + name + ' marcado como consumido.');
      }
      ZWStore.syncUI();
    } catch (err) {
      renderAlerts();
      showToast('⚠️ Error al actualizar alimento: ' + err.message);
    }
  });

  function showToast (msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2800);
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
      const n = editName?.value.trim() || 'María Pérez';
      const em = editEmail?.value.trim() || 'maria@correo.com';
      ZWStore.saveUser({ name: n, email: em });
      refreshUser();
      closeProfileModal();
    });
  }

  window.addEventListener('zw:synced', renderAlerts);
  renderAlerts();

})();
