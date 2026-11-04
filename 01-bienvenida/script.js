/* =============================================
   ZeroWaste – Bienvenida | script.js
   ============================================= */
'use strict';

(function () {

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

  /* Modal de registro / personalizar usuario */
  const btnCrear = document.getElementById('btnCrearCuenta');
  const modalEl = document.getElementById('modalRegistro');
  let bsModal = null;
  if (modalEl && typeof bootstrap !== 'undefined') {
    bsModal = new bootstrap.Modal(modalEl);
  }

  if (btnCrear && bsModal) {
    btnCrear.addEventListener('click', function (e) {
      e.preventDefault();
      const currentUser = ZWStore.getUser();
      const nameInput = document.getElementById('nombreUsuarioInput');
      const emailInput = document.getElementById('correoUsuarioInput');
      if (nameInput && currentUser.name) nameInput.value = currentUser.name;
      if (emailInput && currentUser.email) emailInput.value = currentUser.email;
      bsModal.show();
    });
  }

  const formRegistro = document.getElementById('formRegistro');
  if (formRegistro) {
    formRegistro.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('nombreUsuarioInput')?.value.trim() || 'María Pérez';
      const email = document.getElementById('correoUsuarioInput')?.value.trim() || 'maria@correo.com';
      ZWStore.saveUser({ name: name, email: email });
      window.location.href = '../02-inicio/index.html';
    });
  }

})();
