/* =============================================
   ZeroWaste – Historial y Reponer | script.js
   ============================================= */
'use strict';

(function () {
  /* ---- Perfil de usuario ---- */
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

  /* ---- Elementos del DOM ---- */
  const grid = document.getElementById('historialGrid');
  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const filterChips = document.getElementById('filterChips');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptySub = document.getElementById('emptySub');
  const toast = document.getElementById('toast');
  const countTodos = document.getElementById('countTodos');

  const DIAS_POR_CAT = {
    frutas: 5,
    lacteos: 7,
    carnes: 4,
    cereales: 60,
    bebidas: 30,
    otros: 15
  };

  const CAT_EMOJIS = {
    frutas: '🥑 Frutas y verduras',
    lacteos: '🥛 Lácteos',
    carnes: '🥩 Carnes y pescados',
    cereales: '🌾 Cereales y legumbres',
    bebidas: '🧃 Bebidas',
    otros: '🍱 Otros'
  };

  let todosItems = [];
  let categoriaActual = 'todos';
  let busquedaActual = '';

  function showToast (msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  function calcularFechaSugerida (categoria) {
    const dias = DIAS_POR_CAT[categoria] || 7;
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
  }

  function formatearFecha (fechaStr) {
    if (!fechaStr) return '';
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    } catch (e) {
      return '';
    }
  }

  /* ---- Cargar Historial ---- */
  async function cargarHistorial () {
    if (loadingState) loadingState.hidden = false;
    if (emptyState) emptyState.hidden = true;
    if (grid) grid.innerHTML = '';

    try {
      const data = await ZWStore.getHistorial({ limite: 100 });
      const consumos = (data && data.consumos) ? data.consumos : [];

      // Deduplicar por nombre (quedarse con la última vez que se consumió)
      const mapa = new Map();
      consumos.forEach(function (c) {
        const nombreClave = (c.nombre || '').toLowerCase().trim();
        if (!nombreClave) return;
        if (!mapa.has(nombreClave)) {
          mapa.set(nombreClave, c);
        }
      });

      todosItems = Array.from(mapa.values());
      if (countTodos) countTodos.textContent = todosItems.length;

      renderizarLista();
    } catch (err) {
      console.error('Error al cargar historial:', err);
      showToast('⚠️ No se pudo consultar el historial');
      renderizarLista();
    } finally {
      if (loadingState) loadingState.hidden = true;
    }
  }

  /* ---- Renderizar la lista con filtros ---- */
  function renderizarLista () {
    if (!grid) return;

    let filtrados = todosItems.slice();

    // Filtro por categoría
    if (categoriaActual !== 'todos') {
      filtrados = filtrados.filter(function (it) {
        return it.categoria === categoriaActual;
      });
    }

    // Filtro por búsqueda
    if (busquedaActual) {
      const q = busquedaActual.toLowerCase();
      filtrados = filtrados.filter(function (it) {
        return (it.nombre || '').toLowerCase().includes(q) ||
               (it.categoria || '').toLowerCase().includes(q) ||
               (it.ubicacion || '').toLowerCase().includes(q);
      });
    }

    grid.innerHTML = '';

    if (!filtrados.length) {
      if (emptyState) {
        emptyState.hidden = false;
        if (busquedaActual || categoriaActual !== 'todos') {
          if (emptyTitle) emptyTitle.textContent = 'No hay coincidencias';
          if (emptySub) emptySub.textContent = 'Prueba buscando con otro nombre o cambiando el filtro de categoría.';
        } else {
          if (emptyTitle) emptyTitle.textContent = 'No tienes alimentos en el historial';
          if (emptySub) emptySub.textContent = 'Cuando consumas alimentos, se registrarán automáticamente aquí para que los repongas en un clic.';
        }
      }
      return;
    }

    if (emptyState) emptyState.hidden = true;

    filtrados.forEach(function (item) {
      const card = document.createElement('article');
      card.className = 'h-card';

      const color = item.color || ZWStore.avatarColor(item.nombre);
      const inicial = item.inicial || (item.nombre ? item.nombre.charAt(0).toUpperCase() : '?');
      const catText = CAT_EMOJIS[item.categoria] || item.categoria || 'Otros';
      const fechaConsumo = formatearFecha(item.fecha_consumo);

      const avatarHTML = item.imagen
        ? '<img src="' + item.imagen + '" alt="' + item.nombre + '" referrerpolicy="no-referrer">'
        : inicial;

      card.innerHTML =
        '<div class="h-card-top">' +
          '<div class="h-avatar" style="background:' + color + '">' + avatarHTML + '</div>' +
          '<div class="h-details">' +
            '<h3 class="h-name">' + item.nombre + '</h3>' +
            '<div class="h-tags">' +
              '<span class="h-tag cat">' + catText + '</span>' +
              '<span class="h-tag">📍 ' + (item.ubicacion || 'Despensa') + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="h-meta-row">' +
          '<span>Cantidad anterior: <b>' + (item.cantidad || 1) + ' unid.</b></span>' +
          (fechaConsumo ? '<span>Terminado el ' + fechaConsumo + '</span>' : '') +
        '</div>' +
        '<div class="h-actions">' +
          '<button type="button" class="btn-reponer-directo" data-action="directo">' +
            '<span>➕ Reponer a despensa</span>' +
          '</button>' +
          '<button type="button" class="btn-reponer-ajustar" data-action="ajustar" title="Modificar antes de guardar">' +
            '✏️ Ajustar' +
          '</button>' +
        '</div>';

      // Acción: Reponer directo
      card.querySelector('[data-action="directo"]')?.addEventListener('click', async function (e) {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.innerHTML = '⏳ Guardando...';

        const nuevaFecha = calcularFechaSugerida(item.categoria);
        const nuevoAlimento = {
          name:     item.nombre,
          category: item.categoria || 'otros',
          qty:      item.cantidad || 1,
          location: item.ubicacion || 'refrigeradora',
          expDate:  nuevaFecha,
          notas:    item.notas || '',
          image:    item.imagen || null
        };

        try {
          await ZWStore.addFood(nuevoAlimento);
          showToast('✅ ¡' + item.nombre + ' repuesto con éxito!');
          btn.innerHTML = '✔️ ¡Listo!';
          setTimeout(function () {
            btn.disabled = false;
            btn.innerHTML = '<span>➕ Reponer a despensa</span>';
          }, 2000);
        } catch (err) {
          console.error('Error reponiendo alimento:', err);
          showToast('✅ Guardado');
          btn.disabled = false;
          btn.innerHTML = '<span>➕ Reponer a despensa</span>';
        }
      });

      // Acción: Ajustar en formulario
      card.querySelector('[data-action="ajustar"]')?.addEventListener('click', function () {
        sessionStorage.setItem('zw_reponer_item', JSON.stringify(item));
        window.location.href = '../04-registrar-alimento/index.html';
      });

      grid.appendChild(card);
    });
  }

  /* ---- Eventos de búsqueda y filtros ---- */
  searchInput?.addEventListener('input', function () {
    busquedaActual = searchInput.value.trim();
    if (btnClearSearch) btnClearSearch.hidden = !busquedaActual;
    renderizarLista();
  });

  btnClearSearch?.addEventListener('click', function () {
    searchInput.value = '';
    busquedaActual = '';
    btnClearSearch.hidden = true;
    searchInput.focus();
    renderizarLista();
  });

  filterChips?.addEventListener('click', function (e) {
    const chip = e.target.closest('.f-chip');
    if (!chip) return;
    document.querySelectorAll('.f-chip').forEach(function (c) { c.classList.remove('active'); });
    chip.classList.add('active');
    categoriaActual = chip.dataset.cat || 'todos';
    renderizarLista();
  });

  // Carga inicial
  cargarHistorial();
})();
