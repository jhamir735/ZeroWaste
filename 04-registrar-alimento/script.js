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
      const result = await ZWStore.addFood(newFood);
      if (result && result.savedInBackend) {
        showToast('✅ Alimento registrado en la base de datos (Neon)');
      } else {
        showToast('⚠️ Guardado localmente (Servidor desconectado)');
      }
    } catch (err) {
      console.error('Error al guardar alimento:', err);
      showToast('⚠️ Guardado en caché local');
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

})();
