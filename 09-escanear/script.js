/* =============================================
   ZeroWaste – Escanear productos | script.js

   Flujo:  código de barras (cámara / foto / escrito)
        →  búsqueda en el servidor (/api/productos/barcode/:codigo)
        →  lista editable de "Productos escaneados"
        →  «Agregar a mi despensa» guarda todo con ZWStore.addFood
   ============================================= */
'use strict';

(function () {

  /* ---------- Referencias ---------- */
  const $ = function (id) { return document.getElementById(id); };
  const viewport = $('scViewport'), video = $('scVideo'), frame = $('scFrame'), statusEl = $('scStatus');
  const btnCam = $('btnCam'), btnStop = $('btnStop'), btnTorch = $('btnTorch'), fileInput = $('scFile'), lblFile = $('lblFile');
  const secureBox = $('scSecure'), manualForm = $('scManual'), codeInput = $('scCode');
  const listEl = $('scList'), emptyEl = $('scEmpty'), footEl = $('scFoot'), summaryEl = $('scSummary'), countEl = $('scCount');
  const btnSave = $('btnSaveAll'), btnClear = $('btnClear'), fab = $('scFab'), fabText = $('scFabText');

  const CATEGORIAS = [['frutas', '🥑 Frutas y verduras'], ['lacteos', '🥛 Lácteos'], ['carnes', '🥩 Carnes y pescados'], ['cereales', '🌾 Cereales y legumbres'], ['bebidas', '🧃 Bebidas'], ['otros', '🍱 Otros']];
  const UBICACIONES = [['refrigeradora', '❄️ Refrigeradora'], ['congelador', '🧊 Congelador'], ['despensa', '🏠 Despensa']];
  const STORAGE_KEY = 'zw_scan_tray';

  let items = [];          // productos de la lista
  let stream = null, track = null, rafId = 0, ultimoCuadro = 0;
  let ocupado = false;     // mientras se busca un producto no se lee otro
  let ultimoCodigo = '', ultimoTiempo = 0;
  let decodificador = null; // { tipo:'native'|'zxing', leer(canvas) }

  /* ---------- Utilidades ---------- */
  function mostrarToast (msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(mostrarToast.id);
    mostrarToast.id = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function estado (texto, tipo) {
    if (!texto) { statusEl.hidden = true; return; }
    statusEl.hidden = false;
    statusEl.textContent = texto;
    statusEl.className = 'sc-status' + (tipo ? ' ' + tipo : '');
  }

  function pitido () {
    try {
      if (navigator.vibrate) navigator.vibrate(60);
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 1040; g.gain.value = 0.08;
      o.connect(g); g.connect(ctx.destination); o.start();
      setTimeout(function () { o.stop(); ctx.close(); }, 110);
    } catch (e) { /* sin sonido: no pasa nada */ }
  }

  function fechaISO (dias) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function guardarLista () {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) { /* ignorar */ }
  }
  function cargarLista () {
    try { items = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]') || []; } catch (e) { items = []; }
  }

  function esc (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  /* ---------- Decodificador ----------
     Configura ZXing con TRY_HARDER y BarcodeDetector (GPU acelerado) */
  const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];
  let codeReader = null;
  let barcodeDetector = null;
  let isScanning = false;
  let scanTimer = null;

  function cargarZXing () {
    return new Promise(function (ok, fallo) {
      if (window.ZXing) return ok();
      const s = document.createElement('script');
      s.src = 'vendor/zxing-library.min.js';
      s.onload = ok;
      s.onerror = function () { fallo(new Error('No se pudo cargar el lector de códigos')); };
      document.head.appendChild(s);
    });
  }

  async function prepararDecodificador () {
    if (codeReader) return;

    // 1. Probar BarcodeDetector nativo (GPU en navegadores compatibles)
    if ('BarcodeDetector' in window) {
      try {
        const soportados = await window.BarcodeDetector.getSupportedFormats();
        const formats = FORMATOS.filter(function (f) { return soportados.indexOf(f) !== -1; });
        if (formats.length) {
          barcodeDetector = new window.BarcodeDetector({ formats: formats });
        }
      } catch (e) {
        barcodeDetector = null;
      }
    }

    // 2. Preparar motor ZXing
    try {
      await cargarZXing();
      const Z = window.ZXing;
      if (Z) {
        const hints = new Map();
        hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
          Z.BarcodeFormat.EAN_13,
          Z.BarcodeFormat.EAN_8,
          Z.BarcodeFormat.UPC_A,
          Z.BarcodeFormat.UPC_E,
          Z.BarcodeFormat.CODE_128,
          Z.BarcodeFormat.CODE_39,
          Z.BarcodeFormat.ITF,
          Z.BarcodeFormat.QR_CODE
        ]);
        hints.set(Z.DecodeHintType.TRY_HARDER, true);

        codeReader = new Z.BrowserMultiFormatReader(hints, 500);
      }
    } catch (errZ) {
      console.warn('ZXing initialization:', errZ);
    }
  }

  // Precalentar el decodificador al cargar la página
  prepararDecodificador();

  /* ---------- Cámara ---------- */
  const camaraDisponible = !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  if (!camaraDisponible) {
    secureBox.hidden = false;
    btnCam.disabled = true;
    btnCam.textContent = 'Cámara no disponible';
  }

  async function iniciarCamara () {
    if (!camaraDisponible || stream) return;
    btnCam.disabled = true;
    btnCam.textContent = 'Abriendo cámara…';
    try {
      await prepararDecodificador();

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (errConstraint) {
        // Fallback si la cámara no soporta resolución HD
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } }
        });
      }

      video.srcObject = stream;
      await video.play();
      track = stream.getVideoTracks()[0];

      // Activar autofoco continuo si el dispositivo lo soporta
      try {
        const caps = track && track.getCapabilities ? track.getCapabilities() : {};
        if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
        }
      } catch (e) {}

      const caps = track && track.getCapabilities ? track.getCapabilities() : {};
      btnTorch.hidden = !caps.torch;
      viewport.classList.add('live');
      frame.hidden = false;
      btnStop.hidden = false;
      estado('Apunta al código de barras', '');
      ocupado = false;

      // Iniciar el ciclo de escaneo
      iniciarEscaneo();
    } catch (e) {
      detenerCamara();
      const msg = e && e.name === 'NotAllowedError' ? 'Permiso de cámara denegado. Actívalo en el candado de la barra de direcciones o usa «Tomar foto del código».'
        : e && e.name === 'NotFoundError' ? 'No se encontró ninguna cámara. Usa «Tomar foto del código» o escribe el número.'
        : 'No se pudo abrir la cámara. Usa «Tomar foto del código» o escribe el número.';
      mostrarToast('📷 ' + msg);
      secureBox.hidden = false;
      secureBox.querySelector('b').textContent = 'No se pudo usar la cámara en vivo.';
      secureBox.querySelector('span').textContent = msg;
    } finally {
      if (!stream) { btnCam.disabled = !camaraDisponible; btnCam.textContent = camaraDisponible ? 'Activar cámara' : 'Cámara no disponible'; }
    }
  }

  function iniciarEscaneo () {
    detenerEscaneo();
    isScanning = true;
    cicloEscaneo();
  }

  function detenerEscaneo () {
    isScanning = false;
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
  }

  async function cicloEscaneo () {
    if (!isScanning || !stream) return;

    if (!ocupado && video && video.readyState >= 2 && video.videoWidth > 0) {
      let detectado = null;

      // 1. BarcodeDetector nativo por hardware (Android / navegadores con API nativa)
      if (barcodeDetector) {
        try {
          const codigos = await barcodeDetector.detect(video);
          if (codigos && codigos.length && codigos[0].rawValue) {
            detectado = codigos[0].rawValue;
          }
        } catch (e) {}
      }

      // 2. Lector ZXing directo fotograma a fotograma
      if (!detectado && codeReader) {
        try {
          const res = codeReader.decode(video);
          if (res && res.getText()) {
            detectado = res.getText();
          }
        } catch (e) {
          // Normal: NotFoundException cuando no hay código en el encuadre
        }
      }

      if (detectado) {
        alDetectar(detectado);
      }
    }

    if (isScanning) {
      scanTimer = setTimeout(cicloEscaneo, 160);
    }
  }

  function detenerCamara () {
    detenerEscaneo();
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
    }
    stream = null; track = null;
    if (video) video.srcObject = null;
    viewport.classList.remove('live', 'hit');
    frame.hidden = true;
    btnStop.hidden = true;
    btnTorch.hidden = true;
    btnTorch.classList.remove('on');
    estado('');
    btnCam.disabled = !camaraDisponible;
    btnCam.textContent = camaraDisponible ? 'Activar cámara' : 'Cámara no disponible';
  }

  function alDetectar (crudo) {
    if (!crudo || ocupado) return;
    const digits = String(crudo).replace(/\D/g, '');
    // Acepta códigos de producto numéricos o textos alfanuméricos
    const codigo = (digits.length >= 6 && digits.length <= 18) ? digits : String(crudo).trim();
    if (!codigo) return;

    const ahora = Date.now();
    if (codigo === ultimoCodigo && ahora - ultimoTiempo < 2500) return;   // evita duplicados inmediatos
    ultimoCodigo = codigo; ultimoTiempo = ahora;
    pitido();
    viewport.classList.add('hit');
    setTimeout(function () { viewport.classList.remove('hit'); }, 900);
    procesarCodigo(codigo);
  }

  btnCam.addEventListener('click', iniciarCamara);
  btnStop.addEventListener('click', detenerCamara);
  document.addEventListener('visibilitychange', function () { if (document.hidden) detenerCamara(); });
  window.addEventListener('pagehide', detenerCamara);

  btnTorch.addEventListener('click', async function () {
    if (!track) return;
    const on = !btnTorch.classList.contains('on');
    try {
      await track.applyConstraints({ advanced: [{ torch: on }] });
      btnTorch.classList.toggle('on', on);
      btnTorch.setAttribute('aria-label', on ? 'Apagar linterna' : 'Encender linterna');
    } catch (e) { mostrarToast('Este dispositivo no permite usar la linterna'); }
  });

  /* ---------- Foto del código ---------- */
  lblFile.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });

  fileInput.addEventListener('change', async function () {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    estado('Leyendo la foto…', '');
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise(function (ok, fallo) { img.onload = ok; img.onerror = fallo; img.src = url; });

      let codigo = null;
      // 1. Probar detector nativo si existe
      if (barcodeDetector) {
        try {
          const r = await barcodeDetector.detect(img);
          if (r && r.length && r[0].rawValue) codigo = r[0].rawValue;
        } catch (e) {}
      }

      // 2. Probar lector ZXing
      if (!codigo && window.ZXing) {
        try {
          const Z = window.ZXing;
          const hints = new Map();
          hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
            Z.BarcodeFormat.EAN_13,
            Z.BarcodeFormat.EAN_8,
            Z.BarcodeFormat.UPC_A,
            Z.BarcodeFormat.UPC_E,
            Z.BarcodeFormat.CODE_128,
            Z.BarcodeFormat.CODE_39,
            Z.BarcodeFormat.ITF,
            Z.BarcodeFormat.QR_CODE
          ]);
          hints.set(Z.DecodeHintType.TRY_HARDER, true);
          const imgReader = new Z.BrowserMultiFormatReader(hints);
          const res = await imgReader.decodeFromImageElement(img);
          if (res && res.getText()) codigo = res.getText();
        } catch (e) {}
      }

      URL.revokeObjectURL(url);
      if (codigo) {
        alDetectar(codigo);
      } else {
        estado('No pude leer el código en la foto', 'warn');
        mostrarToast('No pude leer el código. Acércate, enfoca bien con buena luz y que se vea completo; o escribe el número.');
      }
    } catch (e) {
      estado('No se pudo leer la foto', 'warn');
      mostrarToast('No se pudo leer la foto. Prueba de nuevo o escribe el número.');
    }
    if (!stream) setTimeout(function () { estado(''); }, 3500);
  });

  /* ---------- Código escrito ---------- */
  manualForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const c = codeInput.value.replace(/\D/g, '');
    if ([8, 12, 13, 14].indexOf(c.length) === -1) {
      codeInput.classList.add('error');
      mostrarToast('El código debe tener 8, 12, 13 o 14 números');
      codeInput.addEventListener('input', function () { codeInput.classList.remove('error'); }, { once: true });
      return;
    }
    ultimoCodigo = c; ultimoTiempo = Date.now();
    procesarCodigo(c);
    codeInput.value = '';
  });

  /* ---------- Búsqueda del producto ---------- */
  async function procesarCodigo (codigo) {
    const existente = items.find(function (i) { return i.codigo === codigo; });
    if (existente) {
      existente.qty += 1;
      guardarLista(); pintarLista(existente.uid);
      estado('Ya estaba en la lista: ' + (existente.name || 'producto') + ' (+1)', 'ok');
      mostrarToast('➕ Ya lo tenías: sumé 1 a ' + (existente.name || 'este producto'));
      liberarLuego();
      return;
    }

    ocupado = true;
    estado('Buscando producto…', '');
    let r = null;
    try {
      const res = await ZWStore.apiFetch('/productos/barcode/' + codigo);
      r = await res.json().catch(function () { return null; });
    } catch (e) { r = null; }

    const nuevo = { uid: 'p' + Date.now() + Math.floor(Math.random() * 1000), codigo: codigo, qty: 1, name: '', category: '', location: 'refrigeradora', expDate: '', image: null, estado: 'desconocido', sugerida: false };
    if (r && r.found && r.data) {
      const p = r.data;
      Object.assign(nuevo, {
        name: p.nombre, category: p.categoria, location: p.ubicacion || 'despensa', image: p.imagen || null,
        expDate: fechaISO(p.dias_sugeridos || 7), estado: 'encontrado', sugerida: true
      });
      estado('✅ ' + p.nombre, 'ok');
    } else {
      nuevo.estado = r && r.offline ? 'sin-conexion' : 'desconocido';
      estado('Producto no encontrado: complétalo en la lista', 'warn');
    }
    items.unshift(nuevo);
    guardarLista();
    pintarLista(nuevo.uid, nuevo.estado !== 'encontrado');
    liberarLuego();
  }

  function liberarLuego () { setTimeout(function () { ocupado = false; if (stream) estado('Apunta al código de barras', ''); }, 1400); }

  /* ---------- Lista de productos ---------- */
  function opciones (lista, actual, placeholder) {
    return (placeholder ? '<option value="">' + placeholder + '</option>' : '') +
      lista.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === actual ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
  }

  function itemHTML (it) {
    const color = ZWStore.avatarColor(it.name || it.codigo);
    const thumb = it.image
      ? '<img src="' + esc(it.image) + '" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.textContent=\'' + esc((it.name || '?').charAt(0).toUpperCase()) + '\'">'
      : esc((it.name || '?').charAt(0).toUpperCase());
    let nota = 'Código ' + esc(it.codigo);
    let clsNota = 'sc-note';
    if (it.estado === 'desconocido') { nota += ' · No está en el catálogo: escribe el nombre y elige categoría y fecha.'; clsNota += ' warn'; }
    else if (it.estado === 'sin-conexion') { nota += ' · No pude consultar el catálogo (sin conexión): completa los datos.'; clsNota += ' warn'; }
    else if (it.sugerida) nota += ' · La fecha es una estimación: <b>revisa la del envase</b>.';
    return '<li class="sc-item' + (it.estado !== 'encontrado' ? ' unknown' : '') + '" data-uid="' + it.uid + '">' +
      '<div class="sc-thumb" style="background:' + color + '">' + thumb + '</div>' +
      '<div class="sc-fields">' +
        '<input class="sc-name" data-f="name" value="' + esc(it.name) + '" placeholder="Nombre del producto" aria-label="Nombre del producto" maxlength="80">' +
        '<div class="sc-meta">' +
          '<select data-f="category" aria-label="Categoría">' + opciones(CATEGORIAS, it.category, 'Categoría…') + '</select>' +
          '<select data-f="location" aria-label="Ubicación">' + opciones(UBICACIONES, it.location) + '</select>' +
        '</div>' +
        '<div class="sc-row">' +
          '<div class="sc-qty"><button type="button" data-a="menos" aria-label="Menos">−</button><span aria-live="polite">' + it.qty + '</span><button type="button" data-a="mas" aria-label="Más">+</button></div>' +
          '<label class="sc-date-wrap">Vence <input type="date" data-f="expDate" value="' + esc(it.expDate) + '" aria-label="Fecha de vencimiento"></label>' +
        '</div>' +
        '<div class="sc-quick" aria-label="Atajos de fecha"><button type="button" data-d="3">+3 días</button><button type="button" data-d="7">+1 semana</button><button type="button" data-d="30">+1 mes</button></div>' +
        '<p class="' + clsNota + '">' + nota + '</p>' +
      '</div>' +
      '<button type="button" class="sc-del" data-a="quitar" aria-label="Quitar de la lista">✕</button>' +
    '</li>';
  }

  function pintarLista (resaltar, enfocarNombre) {
    listEl.innerHTML = items.map(itemHTML).join('');
    const total = items.reduce(function (s, i) { return s + i.qty; }, 0);
    countEl.textContent = items.length;
    emptyEl.hidden = items.length > 0;
    footEl.hidden = items.length === 0;
    btnClear.hidden = items.length === 0;
    btnSave.disabled = items.length === 0;
    summaryEl.textContent = items.length + (items.length === 1 ? ' producto' : ' productos') + ' · ' + total + (total === 1 ? ' unidad' : ' unidades');
    btnSave.textContent = 'Agregar ' + (items.length === 1 ? '1 producto' : items.length + ' productos') + ' a mi despensa';
    fab.hidden = items.length === 0;
    fabText.textContent = 'Revisar lista (' + items.length + ')';
    if (resaltar) {
      const li = listEl.querySelector('[data-uid="' + resaltar + '"]');
      if (li) {
        li.classList.add('flash');
        if (enfocarNombre) { const n = li.querySelector('.sc-name'); if (n && !stream) n.focus(); }
      }
    }
  }

  function buscarItem (el) {
    const li = el.closest('.sc-item');
    return li ? items.find(function (i) { return i.uid === li.dataset.uid; }) : null;
  }

  listEl.addEventListener('input', function (e) {
    const it = buscarItem(e.target); const f = e.target.dataset.f;
    if (!it || !f) return;
    it[f] = e.target.value; e.target.classList.remove('error'); guardarLista();
  });
  listEl.addEventListener('change', function (e) {
    const it = buscarItem(e.target); const f = e.target.dataset.f;
    if (!it || !f) return;
    it[f] = e.target.value; it.sugerida = f === 'expDate' ? false : it.sugerida; e.target.classList.remove('error'); guardarLista();
  });
  listEl.addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    const it = buscarItem(b);
    if (!it) return;
    if (b.dataset.a === 'quitar') { items = items.filter(function (i) { return i !== it; }); }
    else if (b.dataset.a === 'mas') { it.qty += 1; }
    else if (b.dataset.a === 'menos') { it.qty = Math.max(1, it.qty - 1); }
    else if (b.dataset.d) { it.expDate = fechaISO(parseInt(b.dataset.d, 10)); it.sugerida = false; }
    else return;
    guardarLista(); pintarLista();
  });

  btnClear.addEventListener('click', function () {
    if (!items.length || !window.confirm('¿Vaciar la lista de productos escaneados?')) return;
    items = []; guardarLista(); pintarLista();
  });

  fab.addEventListener('click', function () { $('tray').scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  /* ---------- Guardar todo en la despensa ---------- */
  btnSave.addEventListener('click', async function () {
    let primeroMalo = null;
    items.forEach(function (it) {
      const li = listEl.querySelector('[data-uid="' + it.uid + '"]');
      if (!li) return;
      [['name', !it.name.trim()], ['category', !it.category], ['expDate', !it.expDate]].forEach(function (par) {
        const campo = li.querySelector('[data-f="' + par[0] + '"]');
        if (campo) campo.classList.toggle('error', par[1]);
        if (par[1] && !primeroMalo) primeroMalo = campo;
      });
    });
    if (primeroMalo) {
      primeroMalo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      primeroMalo.focus({ preventScroll: true });
      mostrarToast('Completa nombre, categoría y fecha de los productos marcados en rojo');
      return;
    }

    detenerCamara();
    btnSave.disabled = true;
    btnSave.textContent = '⏳ Guardando…';
    let guardados = 0, localmente = 0;
    for (const it of items.slice().reverse()) {
      try {
        const r = await ZWStore.addFood({
          name: it.name.trim(), category: it.category, qty: it.qty, location: it.location, expDate: it.expDate,
          notas: 'Código de barras: ' + it.codigo, image: it.image || null
        });
        guardados += 1;
        if (!(r && r.savedInBackend)) localmente += 1;
      } catch (e) { console.error('No se pudo guardar', it.name, e); }
    }
    items = []; guardarLista(); pintarLista();
    mostrarToast('✅ ' + guardados + (guardados === 1 ? ' producto guardado' : ' productos guardados') + ' en tu despensa');
    setTimeout(function () { window.location.href = '../03-mis-alimentos/index.html'; }, 1300);
  });

  /* ---------- Perfil rápido (igual que en las otras pantallas) ---------- */
  function refreshUser () {
    const u = ZWStore.getUser();
    const n = $('sbUserName'), em = $('sbUserEmail'), av = $('sbAvatar');
    if (n) n.textContent = u.name;
    if (em && u.email) em.textContent = u.email;
    if (av) av.textContent = (u.name || 'M').charAt(0).toUpperCase();
  }
  refreshUser();
  const modal = $('profileModalOverlay');
  const abrirPerfil = function () { const u = ZWStore.getUser(); $('editUserName').value = u.name || ''; $('editUserEmail').value = u.email || ''; modal.classList.add('open'); };
  const cerrarPerfil = function () { modal.classList.remove('open'); };
  $('sidebarProfileBtn')?.addEventListener('click', abrirPerfil);
  $('btnCloseProfileModal')?.addEventListener('click', cerrarPerfil);
  $('btnCancelProfileModal')?.addEventListener('click', cerrarPerfil);
  modal?.addEventListener('click', function (e) { if (e.target === modal) cerrarPerfil(); });
  $('profileEditForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    ZWStore.saveUser({ name: $('editUserName').value.trim() || 'Usuario', email: $('editUserEmail').value.trim() });
    refreshUser(); cerrarPerfil();
  });

  /* ---------- Inicio ---------- */
  cargarLista();
  pintarLista();
  // Se precarga el lector en segundo plano para que la primera lectura sea inmediata
  if (camaraDisponible) prepararDecodificador().catch(function () { /* se reintentará al activar la cámara */ });

})();
