/* Portfolio · Jorge Valero
   Cuatro comportamientos, nada más: barra de progreso, revelado al entrar en
   pantalla, rebindeo del color de acento por sección, y lupa de capturas. */

(() => {
  'use strict';

  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Barra de progreso de lectura ───────────────────────────────────── */
  const barra = document.querySelector('.progreso__barra');
  const rail = document.querySelector('.rail');

  function alScroll() {
    const alto = document.documentElement.scrollHeight - window.innerHeight;
    const avance = alto > 0 ? window.scrollY / alto : 0;
    barra.style.width = `${avance * 100}%`;
    // El raíl solo aparece una vez has salido de la portada.
    rail.classList.toggle('visible', window.scrollY > window.innerHeight * 0.6);
  }

  let pendiente = false;
  window.addEventListener('scroll', () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { alScroll(); pendiente = false; });
  }, { passive: true });
  alScroll();

  /* ── Revelado al entrar en pantalla ─────────────────────────────────── */
  const porRevelar = document.querySelectorAll('.revelar');

  if (movimientoReducido || !('IntersectionObserver' in window)) {
    porRevelar.forEach((el) => el.classList.add('dentro'));
  } else {
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('dentro');
        observador.unobserve(entrada.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    porRevelar.forEach((el) => observador.observe(el));
  }

  /* ── Color de acento por sección ────────────────────────────────────── */
  // Cada sección declara su acento en data-acento; al entrar en el centro de
  // la pantalla, lo promueve a las variables globales que usa todo el resto
  // de la página (raíl, barra, numerales, bordes).
  const secciones = document.querySelectorAll('[data-acento]');
  const enlacesRail = document.querySelectorAll('[data-rail]');
  const raiz = document.documentElement;

  function activarSeccion(seccion) {
    const estilo = getComputedStyle(seccion);
    const color = estilo.getPropertyValue('--acento-local').trim();
    const rgb = estilo.getPropertyValue('--acento-rgb-local').trim();
    if (color) raiz.style.setProperty('--acento', color);
    if (rgb) raiz.style.setProperty('--acento-rgb', rgb);

    const id = seccion.dataset.railId;
    enlacesRail.forEach((a) => a.classList.toggle('activo', a.dataset.rail === id));
  }

  if ('IntersectionObserver' in window) {
    const observadorColor = new IntersectionObserver((entradas) => {
      // Puede haber dos secciones cruzando la banda central a la vez; nos
      // quedamos con la más visible para no parpadear entre dos colores.
      const visible = entradas
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) activarSeccion(visible.target);
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    secciones.forEach((s) => observadorColor.observe(s));
  }

  /* ── Lupa de capturas ───────────────────────────────────────────────── */
  const lupa = document.getElementById('lupa');
  const lupaImg = lupa.querySelector('.lupa__img');
  const lupaCerrar = lupa.querySelector('.lupa__cerrar');
  let ultimoOrigen = null;

  function abrirLupa(figura) {
    const fuente = figura.dataset.lightbox;
    const img = figura.querySelector('img');
    if (!fuente || !img) return;

    ultimoOrigen = figura;
    lupaImg.src = fuente;
    lupaImg.alt = img.alt;
    lupa.hidden = false;
    // Un frame de margen para que la transición de opacidad tenga de dónde salir.
    requestAnimationFrame(() => lupa.classList.add('abierta'));
    document.body.style.overflow = 'hidden';
    lupaCerrar.focus();
  }

  function cerrarLupa() {
    lupa.classList.remove('abierta');
    document.body.style.overflow = '';
    const finalizar = () => {
      lupa.hidden = true;
      lupaImg.src = '';
      if (ultimoOrigen) { ultimoOrigen.focus?.(); ultimoOrigen = null; }
    };
    if (movimientoReducido) finalizar();
    else setTimeout(finalizar, 350);
  }

  document.querySelectorAll('[data-lightbox]').forEach((figura) => {
    figura.setAttribute('tabindex', '0');
    figura.setAttribute('role', 'button');
    figura.setAttribute('aria-label', 'Ampliar captura');
    figura.addEventListener('click', () => abrirLupa(figura));
    figura.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirLupa(figura); }
    });
  });

  lupaCerrar.addEventListener('click', cerrarLupa);
  lupa.addEventListener('click', (e) => { if (e.target === lupa) cerrarLupa(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lupa.hidden) cerrarLupa();
  });
})();
