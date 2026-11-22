/* =============================================
   ZeroWaste – Registrar Alimento | script.js
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

  /* ---- Subida de foto ---- */
  const photoZone    = document.getElementById('photoZone');
  const photoInput   = document.getElementById('photoInput');
  const photoPreview = document.getElementById('photoPreview');
  const photoHint    = document.getElementById('photoHint');
  let uploadedImageDataUrl = null;

  photoZone?.addEventListener('click', function () { photoInput?.click(); });
  photoZone?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); photoInput?.click(); }
  });

  photoInput?.addEventListener('change', function () {
    const file = photoInput.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      uploadedImageDataUrl = ev.target.result;
      if (photoPreview) {
        photoPreview.innerHTML = '<img src="' + uploadedImageDataUrl + '" alt="Foto seleccionada" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
      }
      if (photoHint) photoHint.textContent = '✅ Foto agregada correctamente';
    };
    reader.readAsDataURL(file);
  });

  /* ---- Control de Cantidad ---- */
  const qtyInput = document.getElementById('cantidadInput');
  document.getElementById('qtyMinus')?.addEventListener('click', function () {
    const v = parseInt(qtyInput.value, 10) || 1;
    if (v > 1) qtyInput.value = v - 1;
  });
  document.getElementById('qtyPlus')?.addEventListener('click', function () {
    qtyInput.value = (parseInt(qtyInput.value, 10) || 1) + 1;
  });

  /* ---- Fechas rápidas y Selector de fecha ---- */
  const fechaInput = document.getElementById('fechaInput');

  function setDateDaysFromToday (days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    if (fechaInput) fechaInput.value = d.toISOString().split('T')[0];
  }

  // Establecer fecha por defecto a hoy + 7 días
  if (fechaInput && !fechaInput.value) {
    setDateDaysFromToday(7);
  }

  document.getElementById('quickDates')?.addEventListener('click', function (e) {
    const btn = e.target.closest('.qd-btn');
    if (!btn) return;
    const days = parseInt(btn.dataset.days, 10);
    setDateDaysFromToday(days);
    document.querySelectorAll('.qd-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });

  fechaInput?.addEventListener('change', function () {
    const val = fechaInput.value;
    let found = false;
    document.querySelectorAll('.qd-btn').forEach(function (b) {
      const days = parseInt(b.dataset.days, 10);
      const testD = new Date();
      testD.setDate(testD.getDate() + days);
      if (testD.toISOString().split('T')[0] === val) {
        b.classList.add('active');
        found = true;
      } else {
        b.classList.remove('active');
      }
    });
    if (!found) {
      document.querySelectorAll('.qd-btn').forEach(function (b) { b.classList.remove('active'); });
    }
  });

  /* ---- Chips de ubicación ---- */
  let selectedLocation = 'refrigeradora';

  document.getElementById('locationChips')?.addEventListener('click', function (e) {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('chip-active'); });
    chip.classList.add('chip-active');
    selectedLocation = chip.dataset.loc;
  });

  /* ---- Enviar formulario y guardar en LocalStorage y PostgreSQL ---- */
  document.getElementById('foodForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const nombre    = document.getElementById('nombreInput')?.value.trim();
    const categoria = document.getElementById('categoriaSelect')?.value;
    const fecha     = fechaInput?.value;
    const cantidad  = parseInt(qtyInput?.value, 10) || 1;
    const notas     = document.getElementById('notasInput')?.value.trim() || '';

    let hasError = false;

    if (!nombre) { shake('nombreInput'); hasError = true; }
    if (!categoria) { shake('categoriaSelect'); hasError = true; }
    if (!fecha) { shake('fechaInput'); hasError = true; }
    if (hasError) return;

    const btnGuardar = document.getElementById('btnGuardar');
    if (btnGuardar) {
      btnGuardar.disabled = true;
      btnGuardar.innerHTML = '⏳ Guardando alimento...';
    }

    const newFood = {
      name:     nombre,
      category: categoria,
      qty:      cantidad,
      location: selectedLocation,
      expDate:  fecha,
      notas:    notas,
      image:    uploadedImageDataUrl || null
    };

    try {
      await ZWStore.addFood(newFood);
      showToast('✅ Guardado');
    } catch (err) {
      console.error('Error al guardar alimento:', err);
      showToast('✅ Guardado');
    }

    setTimeout(function () {
      window.location.href = '../03-mis-alimentos/index.html';
    }, 1100);
  });

  function shake (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('error');
    el.focus();
    el.style.animation = 'shake 0.4s ease';
    el.addEventListener('animationend', function () { el.style.animation = ''; }, { once: true });
    el.addEventListener('input', function () { el.classList.remove('error'); }, { once: true });
    el.addEventListener('change', function () { el.classList.remove('error'); }, { once: true });
  }

  function showToast (msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2000);
  }

  /* Inyectar keyframes de error */
  if (!document.getElementById('kfStyles')) {
    const s = document.createElement('style');
    s.id = 'kfStyles';
    s.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}';
    document.head.appendChild(s);
  }

  /* ---- Reponer desde Historial (1-Click Re-stock) ---- */
  const reponerCard = document.getElementById('reponerCard');
  const reponerList = document.getElementById('reponerList');

  const DIAS_SUGERIDOS_CAT = {
    frutas: 5,
    lacteos: 7,
    carnes: 4,
    cereales: 60,
    bebidas: 30,
    otros: 15
  };

  const CAT_EMOJIS = {
    frutas: '🥑',
    lacteos: '🥛',
    carnes: '🥩',
    cereales: '🌾',
    bebidas: '🧃',
    otros: '🍱'
  };

  async function cargarReponerHistorial () {
    if (!reponerCard || !reponerList) return;
    try {
      // 1. Obtener los alimentos ya existentes en despensa
      const alimentosActuales = ZWStore.getFoods();
      const nombresActuales = new Set(alimentosActuales.map(function (f) { return (f.name || '').toLowerCase().trim(); }));

      // 2. Obtener historial de consumidos desde la BD
      const historialData = await ZWStore.getHistorial({ limite: 30 });
      const consumos = (historialData && historialData.consumos) ? historialData.consumos : [];

      if (!consumos.length) {
        reponerCard.hidden = true;
        return;
      }

      // 3. Filtrar únicos por nombre
      const vistos = new Set();
      const listaSugeridos = [];

      consumos.forEach(function (c) {
        const nombreNorm = (c.nombre || '').toLowerCase().trim();
        if (!nombreNorm || vistos.has(nombreNorm)) return;
        vistos.add(nombreNorm);
        listaSugeridos.push(c);
      });

      if (!listaSugeridos.length) {
        reponerCard.hidden = true;
        return;
      }

      reponerList.innerHTML = '';

      listaSugeridos.slice(0, 10).forEach(function (item) {
        const catEmoji = CAT_EMOJIS[item.categoria] || '🍱';
        const color = item.color || ZWStore.avatarColor(item.nombre);
        const inicial = item.inicial || (item.nombre ? item.nombre.charAt(0).toUpperCase() : '?');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'reponer-item';
        btn.title = 'Toca para autocompletar ' + item.nombre;

        const avatarHTML = item.imagen
          ? '<img src="' + item.imagen + '" alt="' + item.nombre + '" referrerpolicy="no-referrer">'
          : inicial;

        btn.innerHTML =
          '<div class="reponer-item-avatar" style="background:' + color + '">' + avatarHTML + '</div>' +
          '<div class="reponer-item-info">' +
            '<span class="reponer-item-name">' + item.nombre + '</span>' +
            '<span class="reponer-item-meta">' + catEmoji + ' ' + (item.categoria || 'Alimento') + '</span>' +
          '</div>' +
          '<span class="reponer-item-btn">➕ Reponer</span>';

        btn.addEventListener('click', function () {
          aplicarReponer(item);
        });

        reponerList.appendChild(btn);
      });

      reponerCard.hidden = false;
    } catch (e) {
      console.warn('No se pudo cargar el historial para reponer:', e);
      reponerCard.hidden = true;
    }
  }

  function aplicarReponer (item) {
    const nombreInput = document.getElementById('nombreInput');
    const categoriaSelect = document.getElementById('categoriaSelect');
    const notasInput = document.getElementById('notasInput');

    if (nombreInput) nombreInput.value = item.nombre || '';
    if (categoriaSelect) categoriaSelect.value = item.categoria || '';
    if (notasInput && item.notas) notasInput.value = item.notas;

    // Seleccionar ubicación previa
    const ubicacion = item.ubicacion || 'refrigeradora';
    selectedLocation = ubicacion;
    document.querySelectorAll('.chip').forEach(function (c) {
      if (c.dataset.loc === ubicacion) c.classList.add('chip-active');
      else c.classList.remove('chip-active');
    });

    // Calcular fecha inteligente de vencimiento según la categoría
    const dias = DIAS_SUGERIDOS_CAT[item.categoria] || 7;
    setDateDaysFromToday(dias);

    // Cantidad previa o 1
    if (qtyInput) qtyInput.value = item.cantidad || 1;

    // Foto si tenía
    if (item.imagen) {
      uploadedImageDataUrl = item.imagen;
      if (photoPreview) {
        photoPreview.innerHTML = '<img src="' + item.imagen + '" alt="Foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
      }
      if (photoHint) photoHint.textContent = '✅ Foto cargada del historial';
    }

    // Efecto de feedback visual
    const foodForm = document.getElementById('foodForm');
    if (foodForm) {
      foodForm.classList.remove('form-glow');
      void foodForm.offsetWidth;
      foodForm.classList.add('form-glow');
    }

    if (fechaInput) {
      fechaInput.focus();
    }

    showToast('✨ "' + item.nombre + '" autocompletado. ¡Revisa la fecha y guarda!');
  }

  // Cargar lista de reponer al inicio
  cargarReponerHistorial();

  // Verificar si viene con un alimento seleccionado desde la página de historial
  try {
    const itemGuardado = sessionStorage.getItem('zw_reponer_item');
    if (itemGuardado) {
      sessionStorage.removeItem('zw_reponer_item');
      const itemParsed = JSON.parse(itemGuardado);
      if (itemParsed && itemParsed.nombre) {
        setTimeout(function () {
          aplicarReponer(itemParsed);
        }, 100);
      }
    }
  } catch (e) {}

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
