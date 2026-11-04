/* =============================================
   ZeroWaste – Bienvenida / Login | script.js
   ============================================= */
'use strict';

(function () {

  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const btnLogin = document.getElementById('btnLogin');
  const loginIdentifier = document.getElementById('loginIdentifier');
  const loginPassword = document.getElementById('loginPassword');
  const togglePassword = document.getElementById('togglePassword');
  const sessionBox = document.getElementById('sessionBox');
  const authHeader = document.getElementById('authHeader');
  const btnCrear = document.getElementById('btnCrearCuenta');
  const demoBox = document.querySelector('.demo-box');
  const authDivider = document.querySelector('.auth-divider');
  const formRegistro = document.getElementById('formRegistro');
  const registerError = document.getElementById('registerError');
  const btnRegistrar = document.getElementById('btnRegistrar');

  /* Efecto ripple en botones */
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top  - size / 2;
      const ripple = document.createElement('span');
      ripple.style.cssText = 'position:absolute;border-radius:50%;background:rgba(255,255,255,0.28);pointer-events:none;' +
        'width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px;' +
        'animation:ripple 0.55s linear;';
      btn.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 600);
    });
  });

  /* Inyectar keyframe de ripple */
  if (!document.getElementById('rippleKF')) {
    const s = document.createElement('style');
    s.id = 'rippleKF';
    s.textContent = '@keyframes ripple{from{transform:scale(0);opacity:1}to{transform:scale(2.8);opacity:0}}';
    document.head.appendChild(s);
  }

  /* Animación de contador para barra de estadísticas */
  function animateNum (el, target, decimals, prefix, suffix) {
    const dur = 1200;
    const start = performance.now();
    function tick (now) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const val = (target * ease).toFixed(decimals);
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const raw = el.dataset.target;
      if (raw) animateNum(el, parseFloat(el.dataset.target), 0, el.dataset.prefix || '', el.dataset.suffix || '');
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.si-num').forEach(function (el, i) {
    const nums   = [12000, 98000, 2000000];
    const pfx    = ['', '', 'S/ '];
    const sfx    = ['k+', 'k', 'M'];
    const divide = [1000, 1000, 1000000];
    el.dataset.target  = nums[i] / divide[i];
    el.dataset.prefix  = pfx[i];
    el.dataset.suffix  = sfx[i];
    observer.observe(el);
  });

  /* ---------- Utilidades UI ---------- */
  function showError (element, message) {
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
  }

  function hideError (element) {
    if (!element) return;
    element.hidden = true;
    element.textContent = '';
  }

  function setLoading (button, loading, loadingText, normalHtml) {
    if (!button) return;
    button.disabled = loading;
    if (loading) {
      button.dataset.normalHtml = normalHtml || button.innerHTML;
      button.innerHTML = loadingText;
    } else {
      button.innerHTML = button.dataset.normalHtml || normalHtml || button.innerHTML;
    }
  }

  function redirectToApp () {
    window.location.href = '../02-inicio/index.html';
  }

  /* ---------- Sesión activa ---------- */
  function renderSession () {
    const token = ZWStore.getToken();
    if (!token) {
      if (sessionBox) sessionBox.hidden = true;
      if (loginForm) loginForm.hidden = false;
      if (authHeader) authHeader.hidden = false;
      if (btnCrear) btnCrear.hidden = false;
      if (demoBox) demoBox.hidden = false;
      if (authDivider) authDivider.hidden = false;
      return;
    }

    const user = ZWStore.getUser();
    const name = user.name || 'Usuario';
    const avatar = document.getElementById('sessionAvatar');
    const nameEl = document.getElementById('sessionName');
    const emailEl = document.getElementById('sessionEmail');

    if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = user.email || '';

    if (sessionBox) sessionBox.hidden = false;
    if (loginForm) loginForm.hidden = true;
    if (authHeader) authHeader.hidden = true;
    if (btnCrear) btnCrear.hidden = true;
    if (demoBox) demoBox.hidden = true;
    if (authDivider) authDivider.hidden = true;
  }

  document.getElementById('btnContinueSession')?.addEventListener('click', function (e) {
    e.preventDefault();
    redirectToApp();
  });

  document.getElementById('btnLogoutSession')?.addEventListener('click', function () {
    ZWStore.clearSession();
    renderSession();
    showError(loginError, 'Sesión cerrada. Puedes iniciar sesión con otra cuenta.');
    if (loginIdentifier) loginIdentifier.value = '';
    if (loginPassword) loginPassword.value = '';
    if (loginIdentifier) loginIdentifier.focus();
  });

  /* ---------- Mostrar / ocultar contraseña ---------- */
  togglePassword?.addEventListener('click', function () {
    if (!loginPassword) return;
    const showing = loginPassword.type === 'text';
    loginPassword.type = showing ? 'password' : 'text';
    togglePassword.textContent = showing ? '👁' : '🙈';
    togglePassword.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });

  /* ---------- Formulario de login ---------- */
  loginForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError(loginError);

    const identifier = (loginIdentifier?.value || '').trim();
    const password = loginPassword?.value || '';

    if (!identifier || !password) {
      showError(loginError, 'Ingresa tu usuario o correo y tu contraseña.');
      return;
    }

    setLoading(btnLogin, true, '⏳ Verificando credenciales...', 'Iniciar sesión');

    try {
      await ZWStore.login(identifier, password);
      renderSession();
      redirectToApp();
    } catch (err) {
      showError(loginError, err.message || 'No se pudo iniciar sesión.');
      setLoading(btnLogin, false, '', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Iniciar sesión');
      if (loginPassword) {
        loginPassword.value = '';
        loginPassword.focus();
      }
    }
  });

  /* ---------- Modal de registro ---------- */
  const modalEl = document.getElementById('modalRegistro');
  let bsModal = null;
  if (modalEl && typeof bootstrap !== 'undefined') {
    bsModal = new bootstrap.Modal(modalEl);
  }

  btnCrear?.addEventListener('click', function (e) {
    e.preventDefault();
    hideError(registerError);
    if (formRegistro) formRegistro.reset();
    if (bsModal) bsModal.show();
  });

  if (formRegistro) {
    formRegistro.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideError(registerError);

      const nombre = (document.getElementById('nombreUsuarioInput')?.value || '').trim();
      const username = (document.getElementById('usernameRegistroInput')?.value || '').trim();
      const email = (document.getElementById('correoUsuarioInput')?.value || '').trim();
      const password = document.getElementById('passwordRegistroInput')?.value || '';
      const confirmar = document.getElementById('confirmPasswordInput')?.value || '';

      if (password !== confirmar) {
        showError(registerError, 'Las contraseñas no coinciden.');
        return;
      }
      if (password.length < 6) {
        showError(registerError, 'La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      setLoading(btnRegistrar, true, '⏳ Creando tu cuenta...', 'Crear cuenta');

      try {
        await ZWStore.register({
          nombre: nombre,
          username: username,
          email: email,
          password: password,
          confirmar_password: confirmar
        });
        if (bsModal) bsModal.hide();
        redirectToApp();
      } catch (err) {
        showError(registerError, err.message || 'No se pudo crear la cuenta.');
        setLoading(btnRegistrar, false, '', 'Crear cuenta');
      }
    });
  }

  // Sugerir nombre de usuario a partir del correo
  document.getElementById('correoUsuarioInput')?.addEventListener('blur', function () {
    const usernameInput = document.getElementById('usernameRegistroInput');
    if (!usernameInput || usernameInput.value.trim()) return;
    const localPart = this.value.split('@')[0] || '';
    const suggested = localPart
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');
    if (suggested) usernameInput.value = suggested;
  });

  /* ---------- Inicio ---------- */
  renderSession();
  if (!ZWStore.getToken()) {
    setTimeout(function () { loginIdentifier?.focus(); }, 250);
  }

})();
